import os
from datetime import datetime, timedelta
from functools import wraps
from io import BytesIO
import requests
import json
from flask import (
    Flask, render_template, request, redirect, url_for,
    session, send_file, flash, jsonify
)

from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4
from dotenv import load_dotenv
from PIL import Image

# ---------------------------
# APP CONFIG
# ---------------------------
load_dotenv()

class Config:
    # FIX: Use 'postgresql+psycopg2' dialect for Render compatibility
    SQLALCHEMY_DATABASE_URI = os.environ.get("DATABASE_URL", "sqlite:///schools.db")
    if SQLALCHEMY_DATABASE_URI.startswith("postgres://"):
        SQLALCHEMY_DATABASE_URI = SQLALCHEMY_DATABASE_URI.replace(
            "postgres://", "postgresql+psycopg2://", 1
        )
    SECRET_KEY = os.environ.get("SECRET_KEY")
    if not SECRET_KEY:
        # Recommended practice for local dev if .env is missing
        raise ValueError("SECRET_KEY must be set in environment for security.")
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = "Lax"
    SESSION_COOKIE_SECURE = os.environ.get("FLASK_ENV") == "production"
    UPLOAD_FOLDER = os.path.join("static", "logos")
    ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg"}
    
    PAYSTACK_PUBLIC_KEY = os.environ.get("PAYSTACK_PUBLIC_KEY")
    PAYSTACK_SECRET_KEY = os.environ.get("PAYSTACK_SECRET_KEY")
    PAYSTACK_SUBSCRIPTION_AMOUNT = 1000000 # in kobo, for NGN 10,000
    
    TRIAL_LIMIT = 2

app = Flask(__name__)
app.config.from_object(Config)

os.makedirs(app.config["UPLOAD_FOLDER"], exist_ok=True)

db = SQLAlchemy(app)
migrate = Migrate(app, db)

# ---------------------------
# MODELS
# ---------------------------
class School(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(150), nullable=False, unique=True)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password = db.Column(db.String(200), nullable=False)
    subscription_expiry = db.Column(db.Date, nullable=False)
    logo_filename = db.Column(db.String(250), nullable=True)
    address = db.Column(db.String(250), nullable=True)
    phone_number = db.Column(db.String(50), nullable=True)
    
    # NEW FIELD for manually tracking total expected fees (stored in kobo/cents)
    expected_fees_this_term = db.Column(db.Integer, default=0) 
    
    students = db.relationship("Student", backref="school", lazy=True)

class Student(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(150), nullable=False)
    reg_number = db.Column(db.String(50), nullable=False)
    student_class = db.Column(db.String(50), nullable=False)
    school_id = db.Column(db.Integer, db.ForeignKey("school.id"), nullable=False)
    payments = db.relationship("Payment", backref="student", lazy=True)

class Payment(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    # NOTE: Assuming amount_paid is stored in the primary currency unit (Naira)
    amount_paid = db.Column(db.Float, nullable=False) 
    payment_date = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    payment_type = db.Column(db.String(100))
    term = db.Column(db.String(20))
    session = db.Column(db.String(20))
    student_id = db.Column(db.Integer, db.ForeignKey("student.id"), nullable=False)

class Fee(db.Model):
    # DEPRECATED model, kept for old references
    id = db.Column(db.Integer, primary_key=True)
    student_class = db.Column(db.String(50), nullable=False)
    term = db.Column(db.String(20), nullable=False)
    session = db.Column(db.String(20), nullable=False)
    amount = db.Column(db.Float, nullable=False)
    school_id = db.Column(db.Integer, db.ForeignKey("school.id"), nullable=False)

# NEW MODEL: FeeStructure
class FeeStructure(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    class_name = db.Column(db.String(50), nullable=False)
    # Stored in kobo/cents for precision
    expected_amount = db.Column(db.Integer, nullable=False, default=0)
    school_id = db.Column(db.Integer, db.ForeignKey("school.id"), nullable=False)
    
    __table_args__ = (db.UniqueConstraint('school_id', 'class_name', name='_school_class_uc'),)


# ---------------------------
# HELPERS
# ---------------------------
def current_school():
    if "school_id" in session:
        return db.session.get(School, session["school_id"])
    return None

def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        school = current_school()
        if not school:
            flash("Please log in first.", "warning")
            return redirect(url_for("index"))
        
        # NEW: Check trial limit if subscription is expired
        if school.subscription_expiry < datetime.today().date():
            # Check the number of students
            student_count = Student.query.filter_by(school_id=school.id).count()
            # FIX: Used the correct endpoint names
            subscription_endpoint = 'pay_with_paystack_subscription'
            if student_count >= app.config['TRIAL_LIMIT']:
                if request.endpoint not in [subscription_endpoint, 'paystack_callback', 'logout']:
                    flash(f"Your trial has ended. Please subscribe to add more than {app.config['TRIAL_LIMIT']} students.", "danger")
                    return redirect(url_for(subscription_endpoint))
        return f(*args, **kwargs)
    return decorated_function

def allowed_file(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in app.config["ALLOWED_EXTENSIONS"]

def get_logo_path(school):
    if school and school.logo_filename:
        return os.path.join(app.config["UPLOAD_FOLDER"], school.logo_filename)
    return None

def handle_logo_upload(school):
    if "logo" not in request.files:
        flash("No file part in the request.", "danger")
        return False
    file = request.files["logo"]
    if file.filename == '':
        flash("No selected file.", "danger")
        return False
    if not allowed_file(file.filename):
        flash("Invalid file type. Please upload a PNG or JPG.", "danger")
        return False
    filename = secure_filename(f"{school.id}_{file.filename}")
    file_path = os.path.join(app.config["UPLOAD_FOLDER"], filename)
    try:
        file_content = file.read()
        with Image.open(BytesIO(file_content)) as img:
            img_format = img.format.upper()
            if img_format not in ("JPEG", "PNG"):
                flash("Invalid image content. File is not a valid JPEG or PNG.", "danger")
                return False
        with open(file_path, "wb") as f:
            f.write(file_content)
        school.logo_filename = filename
        db.session.commit()
        flash("Logo uploaded successfully!", "success")
        return True
    except Exception as e:
        flash(f"Error processing image: {e}", "danger")
        return False

def create_new_payment(form_data, student):
    try:
        # Amount expected to be in Naira (or primary currency unit)
        amount = float(form_data.get("amount") or form_data.get("amount_paid")) 
        if amount <= 0:
            flash("Amount must be greater than zero.", "danger")
            return None
    except (TypeError, ValueError):
        flash("Invalid amount.", "danger")
        return None
    
    term = form_data.get("term", "").strip()
    session_year = form_data.get("session", "").strip()
    payment_type = form_data.get("payment_type", "").strip()
    
    if not all([amount, term, session_year, payment_type]):
        flash("All payment fields are required.", "danger")
        return None
        
    payment = Payment(
        amount_paid=amount,
        payment_date=datetime.utcnow(),
        term=term,
        session=session_year,
        payment_type=payment_type,
        student_id=student.id
    )
    db.session.add(payment)
    db.session.commit()
    return payment

# ---------------------------
# AUTH
# ---------------------------
@app.route("/", methods=["GET", "POST"])
def index():
    if request.method == "POST":
        email = request.form.get("email", "").strip()
        password = request.form.get("password", "")
        school = School.query.filter_by(email=email).first()
        if school and check_password_hash(school.password, password):
            session["school_id"] = school.id
            return redirect(url_for("dashboard"))
        flash("Invalid email or password.", "danger")
    return render_template("index.html")

@app.route("/register", methods=["GET", "POST"])
def register():
    if request.method == "POST":
        name = request.form.get("school_name", "").strip()
        email = request.form.get("email", "").strip()
        password = request.form.get("password", "")
        if School.query.filter((School.email == email) | (School.name == name)).first():
            flash("School already exists!", "danger")
            return redirect(url_for("register"))
        hashed_pw = generate_password_hash(password)
        # Give a trial period on registration (e.g., 30 days)
        initial_expiry = datetime.today().date() + timedelta(days=30) 
        school = School(
            name=name,
            email=email,
            password=hashed_pw,
            subscription_expiry=initial_expiry,
        )
        db.session.add(school)
        db.session.commit()
        flash("School registered successfully! Please log in.", "success")
    return render_template("register.html")

@app.route("/logout")
def logout():
    session.pop("school_id", None)
    flash("Logged out.", "info")
    return redirect(url_for("index"))

# ---------------------------
# DASHBOARD
# ---------------------------
@app.route("/dashboard")
@login_required
def dashboard():
    school = current_school()
    
    total_students = Student.query.filter_by(school_id=school.id).count()
    
    # Total payments made (stored in Naira/Primary Currency, then converted to kobo for display consistency)
    total_payments_naira = (db.session.query(db.func.sum(Payment.amount_paid))
                            .join(Student)
                            .filter(Student.school_id == school.id)
                            .scalar()) or 0
    total_payments_kobo = int(total_payments_naira * 100)
                            
    recent_payments = (Payment.query.join(Student)
                              .filter(Student.school_id == school.id)
                              .order_by(Payment.payment_date.desc())
                              .limit(5)
                              .all())
                              
    # ----------------------------------------------------
    # FIX: Calculate Outstanding Balance using Manual Input (in kobo/cents)
    # ----------------------------------------------------
    
    # 1. Get the manually entered expected fees (stored in kobo/cents)
    expected_fees_kobo = school.expected_fees_this_term or 0
    
    # 2. Calculate the outstanding balance (still in kobo/cents)
    outstanding_balance_kobo = expected_fees_kobo - total_payments_kobo
    
    # Ensure the balance is not negative (if the school has been overpaid)
    if outstanding_balance_kobo < 0:
        outstanding_balance_kobo = 0
        
    # ----------------------------------------------------

    return render_template(
        "dashboard.html",
        total_students=total_students,
        # Pass the calculated kobo/cent values
        total_payments=total_payments_kobo, 
        outstanding_balance=outstanding_balance_kobo,
        recent_payments=recent_payments,
        school=school,
    )
# ---------------------------
# LOGO UPLOAD
# ---------------------------
@app.route("/upload_logo", methods=["POST"])
@login_required
def upload_logo():
    school = current_school()
    handle_logo_upload(school)
    return redirect(url_for("dashboard"))

# ---------------------------
# STUDENTS (List and inline add)
# ---------------------------
@app.route("/students", methods=["GET", "POST"])
@login_required
def students():
    school = current_school()
    
    if request.method == "POST":
        student_count = Student.query.filter_by(school_id=school.id).count()
        # FIX: Used the correct endpoint names
        subscription_endpoint = 'pay_with_paystack_subscription'
        if school.subscription_expiry < datetime.today().date() and student_count >= app.config['TRIAL_LIMIT']:
            flash(f"Your trial has ended. Please subscribe to add more students.", "danger")
            return redirect(url_for(subscription_endpoint))
            
        name = request.form.get("name", "").strip()
        reg_number = request.form.get("reg_number", "").strip()
        student_class = request.form.get("student_class", "").strip()
        
        if not all([name, reg_number, student_class]):
            flash("All fields are required.", "danger")
        else:
            existing_student = Student.query.filter_by(school_id=school.id, reg_number=reg_number).first()
            if existing_student:
                flash(f"Student with registration number '{reg_number}' already exists.", "danger")
            else:
                student = Student(
                    name=name,
                    reg_number=reg_number,
                    student_class=student_class,
                    school_id=school.id,
                )
                db.session.add(student)
                db.session.commit()
                flash("Student added successfully.", "success")
        return redirect(url_for("students"))
        
    students_list = Student.query.filter_by(school_id=school.id).all()
    student_count = len(students_list)
    trial_active = school.subscription_expiry >= datetime.today().date() or student_count < app.config['TRIAL_LIMIT']
    
    return render_template("students.html", students=students_list, student_count=student_count, trial_limit=app.config['TRIAL_LIMIT'], trial_active=trial_active)

# ---------------------------
# API ENDPOINTS
# ---------------------------
@app.route("/search-students", methods=["GET"])
@login_required
def search_students():
    school = current_school()
    query = request.args.get("q", "").strip()
    students = []
    if len(query) >= 2:
        students = Student.query.filter(
            Student.school_id == school.id,
            db.or_(
                Student.name.ilike(f"%{query}%"),
                Student.reg_number.ilike(f"%{query}%")
            )
        ).limit(10).all()
    results = [{"id": s.id, "name": s.name, "reg_number": s.reg_number, "student_class": s.student_class} for s in students]
    return jsonify(students=results)

@app.route("/student-financials", methods=["GET"])
@login_required
def student_financials():
    student_id = request.args.get("student_id", type=int)
    term = request.args.get("term", "").strip()
    session_year = request.args.get("session", "").strip()
    school = current_school()
    student = db.session.get(Student, student_id)
    if not student or student.school_id != school.id:
        return jsonify(error="Student not found or access denied."), 404
    
    # 1. Get expected fee from FeeStructure (in kobo/cents)
    fee_structure = FeeStructure.query.filter_by(
        school_id=school.id,
        class_name=student.student_class
    ).first()
    expected_amount_kobo = fee_structure.expected_amount if fee_structure else 0
    
    # 2. Calculate total paid for this term/session (Payment.amount_paid is Naira/Primary Currency)
    total_paid_naira_query = db.session.query(db.func.sum(Payment.amount_paid)).filter_by(
        student_id=student.id,
        term=term,
        session=session_year
    ).scalar()
    total_paid_naira = total_paid_naira_query or 0.0
    total_paid_kobo = int(total_paid_naira * 100)
    
    # 3. Calculate outstanding (in kobo/cents)
    # NOTE: This calculation is term-specific, which is a flaw if FeeStructure is annual/term-agnostic.
    # For now, we follow the old logic structure and use FeeStructure's annual amount for term calculation.
    outstanding_kobo = expected_amount_kobo - total_paid_kobo
    if outstanding_kobo < 0:
        outstanding_kobo = 0
        
    # Convert back to Naira for client-side display in API response
    return jsonify({
        # NOTE: Returning kobo/100 for client display in Naira
        "total_fee": expected_amount_kobo / 100.0, 
        "total_paid": total_paid_naira,
        "outstanding": outstanding_kobo / 100.0 
    })

# ---------------------------
# PAYSTACK INTEGRATION ROUTES
# ---------------------------
# FIX: Added 'GET' method to allow the sidebar link to load the page.
@app.route("/pay-with-paystack-subscription", methods=["GET", "POST"])
@login_required
def pay_with_paystack_subscription():
    school = current_school()
    
    # If the request is a GET, render the page.
    if request.method == "GET":
        return render_template(
            "subscription.html",
            school=school,
            subscription_amount=app.config['PAYSTACK_SUBSCRIPTION_AMOUNT'] / 100, # Convert kobo to NGN
            today=datetime.today().date()
        )

    # If the request is a POST, initialize payment.
    paystack_api_url = "https://api.paystack.co/transaction/initialize"
    headers = {
        "Authorization": f"Bearer {app.config['PAYSTACK_SECRET_KEY']}",
        "Content-Type": "application/json"
    }
    payload = {
        "email": school.email,
        "amount": app.config['PAYSTACK_SUBSCRIPTION_AMOUNT'],
        "currency": "NGN",
        "reference": f"SP-SUB-{datetime.utcnow().timestamp()}",
        "callback_url": url_for("paystack_callback", _external=True)
    }
    
    try:
        response = requests.post(paystack_api_url, headers=headers, data=json.dumps(payload))
        response.raise_for_status()
        res_data = response.json()

        if res_data["status"]:
            # The front end expects a JSON response with redirect_url
            return jsonify(redirect_url=res_data["data"]["authorization_url"])
        else:
            return jsonify(error=res_data["message"]), 400
    except requests.exceptions.RequestException as e:
        return jsonify(error=f"Paystack API error: {e}"), 500

@app.route("/paystack/callback", methods=["GET"])
@login_required
def paystack_callback():
    reference = request.args.get("reference")
    school = current_school()

    if not reference:
        flash("Invalid payment callback.", "danger")
        return redirect(url_for("pay_with_paystack_subscription")) 
    
    paystack_verify_url = f"https://api.paystack.co/transaction/verify/{reference}"
    headers = {"Authorization": f"Bearer {app.config['PAYSTACK_SECRET_KEY']}"}

    try:
        response = requests.get(paystack_verify_url, headers=headers)
        response.raise_for_status()
        res_data = response.json()

        if res_data["status"] and res_data["data"]["status"] == "success":
            # Add 1 year to the subscription expiry date
            school.subscription_expiry = datetime.today().date() + timedelta(days=365)
            db.session.commit()
            flash("Subscription renewed successfully!", "success")
        else:
            flash("Subscription payment failed or was not verified.", "danger")

    except requests.exceptions.RequestException as e:
        flash(f"Payment verification failed: {e}", "danger")
    
    return redirect(url_for("pay_with_paystack_subscription")) 

@app.route("/add-payment", methods=["GET", "POST"])
@login_required
def add_payment():
    school = current_school()
    
    if request.method == "POST":
        student_id = request.form.get("student_id")
        
        if not student_id:
            if request.accept_mimetypes.accept_json:
                return jsonify(error="No student selected."), 400
            flash("No student selected.", "danger")
            return redirect(url_for("add_payment"))
            
        # --- Input validation for student_id ---
        try:
            student_id = int(student_id)
        except (ValueError, TypeError):
            if request.accept_mimetypes.accept_json:
                return jsonify(error="Invalid student ID format."), 400
            flash("Invalid student ID.", "danger")
            return redirect(url_for("add_payment"))

        student = db.session.get(Student, student_id)
        if not student or student.school_id != school.id:
            if request.accept_mimetypes.accept_json:
                return jsonify(error="Student not found or access denied."), 404
            flash("Student not found or access denied.", "danger")
            return redirect(url_for("add_payment"))
            
        # --- Core Payment Logic with Error Catching ---
        try:
            new_payment = create_new_payment(request.form, student)
            
            if new_payment:
                # SUCCESS RESPONSE FIX: Explicitly return 200 OK
                if request.accept_mimetypes.accept_json:
                    return jsonify({
                        "message": "Payment recorded successfully!",
                        "student_name": student.name,
                        "student_class": student.student_class,
                        "amount_paid": new_payment.amount_paid,
                        "payment_type": new_payment.payment_type,
                        "term": new_payment.term,
                        "session": new_payment.session,
                        "date": new_payment.payment_date.strftime("%Y-%m-%d %H:%M"),
                        # Added redirect URL for client-side navigation
                        "redirect_url": url_for("payment_receipt", payment_id=new_payment.id)
                    }), 200 # <-- CRITICAL: ADDED STATUS CODE 200
                
                # Standard (non-AJAX) success path
                flash("Payment added successfully", "success")
                return redirect(url_for("payment_receipt", payment_id=new_payment.id))

            # If create_new_payment failed but didn't throw an exception (e.g., returned None)
            if request.accept_mimetypes.accept_json:
                return jsonify(error="Payment creation failed internally."), 500
            flash("Payment creation failed. Please check input values.", "danger")
            return redirect(url_for("add_payment"))

        except Exception as e:
            # If the database commit *succeeded* but something else failed afterward
            db.session.rollback()
            app.logger.error(f"Critical error after payment save in add_payment route: {e}")
            
            if request.accept_mimetypes.accept_json:
                # This 500 response will trigger the client error message
                return jsonify(error="An unexpected server error occurred after transaction. Check server logs."), 500
            
            flash("An unexpected error occurred. Please try again.", "danger")
            return redirect(url_for("add_payment"))

    # GET Request logic (unchanged)
    student_to_prefill = None
    student_id_from_url = request.args.get("student_id")
    if student_id_from_url:
        try:
            student_to_prefill = db.session.get(Student, int(student_id_from_url))
            if not student_to_prefill or student_to_prefill.school_id != school.id:
                flash("Access denied or student not found.", "danger")
                student_to_prefill = None
        except (ValueError, TypeError):
            flash("Invalid student ID in URL.", "danger")

    return render_template("add_payment_global.html", student_to_prefill=student_to_prefill)


# ---------------------------
# FEE STRUCTURE MANAGEMENT
# ---------------------------
@app.route("/fee-structure", methods=["GET", "POST"])
@login_required
def fee_structure():
    school = current_school()
    
    if request.method == "POST":
        class_name = request.form.get('class_name').strip()
        expected_amount_naira = request.form.get('expected_amount').strip()
        
        if not class_name or not expected_amount_naira:
            flash("Class name and expected amount are required.", "danger")
            return redirect(url_for('fee_structure'))

        try:
            # Convert Naira input to kobo/cents for storage
            expected_amount_kobo = int(float(expected_amount_naira) * 100)
            if expected_amount_kobo < 0:
                raise ValueError("Amount cannot be negative.")
        except ValueError:
            flash("Invalid amount entered.", "danger")
            return redirect(url_for('fee_structure'))

        # Check for existing structure for this class
        existing_fee = FeeStructure.query.filter_by(
            school_id=school.id, 
            class_name=class_name
        ).first()

        if existing_fee:
            # Update existing fee
            existing_fee.expected_amount = expected_amount_kobo
            db.session.commit()
            flash(f"Fee structure for {class_name} updated successfully.", "success")
        else:
            # Create new fee
            new_fee = FeeStructure(
                school_id=school.id,
                class_name=class_name,
                expected_amount=expected_amount_kobo
            )
            db.session.add(new_fee)
            db.session.commit()
            flash(f"Fee structure for {class_name} created successfully.", "success")

        return redirect(url_for('fee_structure'))

    # GET Request: Display all fee structures
    fee_structures = FeeStructure.query.filter_by(school_id=school.id).order_by(FeeStructure.class_name).all()
    
    # Get a list of unique class names currently in use by students
    active_classes = db.session.query(Student.student_class).filter_by(school_id=school.id).distinct().all()
    active_classes = [c[0] for c in active_classes if c[0] is not None]
    
    return render_template("fee_structure.html", 
                           fee_structures=fee_structures,
                           active_classes=active_classes)

# ---------------------------
# FEE STRUCTURE DELETION
# ---------------------------
@app.route("/fee-structure/delete/<int:fee_id>", methods=["POST"])
@login_required
def delete_fee_structure(fee_id):
    school = current_school()
    fee = db.session.get(FeeStructure, fee_id)
    
    if fee and fee.school_id == school.id:
        class_name = fee.class_name
        db.session.delete(fee)
        db.session.commit()
        flash(f"Fee structure for {class_name} deleted successfully.", "success")
    else:
        flash("Fee structure not found or access denied.", "danger")
        
    return redirect(url_for('fee_structure'))


# ---------------------------
# PAYMENTS (global listing + search/filter)
# ---------------------------
@app.route("/payments", methods=["GET"])
@login_required
def payments():
    school = current_school()
    search = request.args.get("search", "").strip()
    term = request.args.get("term", "").strip()
    session_year = request.args.get("session", "").strip()
    page = request.args.get("page", 1, type=int)

    query = Payment.query.join(Student).filter(Student.school_id == school.id)

    if search:
        query = query.filter(
            db.or_(
                Student.name.ilike(f"%{search}%"),
                Student.reg_number.ilike(f"%{search}%")
            )
        )
    if term:
        query = query.filter(Payment.term == term)
    if session_year:
        query = query.filter(Payment.session == session_year)
    
    payments_paginated = query.order_by(Payment.payment_date.desc()).paginate(page=page, per_page=20)
    
    students_list = []
    if not payments_paginated.items and search:
        students_list = Student.query.filter(
            Student.school_id == school.id,
            db.or_(
                Student.name.ilike(f"%{search}%"),
                Student.reg_number.ilike(f"%{search}%")
            )
        ).all()

    return render_template(
        "payments.html",
        payments=payments_paginated.items,
        pagination=payments_paginated,
        students=students_list,
        search=search,
        term=term,
        session_year=session_year,
    )

# ---------------------------
# RECEIPT GENERATOR (Search Page) 
# ---------------------------# Enhanced app.py receipt_generator function
@app.route("/receipt-generator", methods=["GET"])
@login_required
def receipt_generator():
    school = current_school()
    search_query = request.args.get('search_query', '').strip()
    students_list = []
    
    if search_query:
        # 1. Fetch students
        students_list = Student.query.filter(
            Student.school_id == school.id,
            db.or_(
                Student.name.ilike(f"%{search_query}%"),
                Student.reg_number.ilike(f"%{search_query}%")
            )
        ).order_by(Student.name).all()
        
        # 2. Attach recent payments to each student object
        for student in students_list:
            student.payments = Payment.query.filter_by(student_id=student.id)\
                                           .order_by(Payment.payment_date.desc())\
                                           .limit(5).all() # Limit to 5 recent payments
    
    return render_template('receipt.htmll', 
                           students_list=students_list, 
                           search_query=search_query)


# ---------------------------
# PAYMENT RECEIPT GENERATION (Detailed View)
# ---------------------------
@app.route("/payment_receipt/<int:payment_id>")
@login_required
def payment_receipt(payment_id):
    school = current_school()
    
    # 1. Get the current payment
    payment = db.session.get(Payment, payment_id)
    if not payment or payment.student.school_id != school.id:
        flash("Payment receipt not found or access denied.", "danger")
        return redirect(url_for('dashboard'))

    student = payment.student
    student_class = student.student_class

    # 2. Get the expected fee for the student's class from FeeStructure (in kobo/cents)
    expected_fee_structure = FeeStructure.query.filter_by(
        school_id=school.id,
        class_name=student_class
    ).first()
    
    # Default expected amount to 0 if no fee structure is defined for the class
    expected_amount_kobo = expected_fee_structure.expected_amount if expected_fee_structure else 0

    # 3. Calculate total payments made by this student (all payments linked to this student)
    # Payment.amount_paid is in Naira/Primary Currency. Convert to kobo for consistency with FeeStructure.
    total_paid_naira = db.session.query(db.func.sum(Payment.amount_paid)). \
        filter(Payment.student_id == student.id). \
        scalar() or 0
    total_paid_kobo = int(total_paid_naira * 100)
        
    # 4. Calculate outstanding balance
    outstanding_balance_kobo = expected_amount_kobo - total_paid_kobo
    
    # Ensure outstanding balance is not negative (in case of overpayment)
    if outstanding_balance_kobo < 0:
        outstanding_balance_kobo = 0

    # 5. Pass all calculated values to the template
    return render_template(
        "receipt.html",
        payment=payment,
        student=student,
        expected_amount=expected_amount_kobo,
        total_paid=total_paid_kobo,
        outstanding_balance=outstanding_balance_kobo
    )

# ---------------------------
# RECEIPT (HTML preview) - RENAMED TO FIX CONFLICT
# ---------------------------
@app.route("/receipt/<int:payment_id>", methods=["GET"])
@login_required
def view_receipt_html(payment_id): # <-- RENAMED FUNCTION
    payment = db.session.get(Payment, payment_id)
    school = current_school()
    if not payment or payment.student.school_id != school.id:
        flash("Access denied or payment not found", "danger")
        return redirect(url_for("dashboard"))
    return render_template("receipt.html", payment=payment, school=school)

@app.route("/receipt/<int:payment_id>/download", methods=["GET"])
@login_required
def download_receipt(payment_id):
    payment = db.session.get(Payment, payment_id)
    school = current_school()
    if not payment or payment.student.school_id != school.id:
        flash("Access denied or payment not found", "danger")
        return redirect(url_for("dashboard"))
    buffer = BytesIO()
    c = canvas.Canvas(buffer, pagesize=A4)
    width, height = A4
    logo_path = get_logo_path(school)
    if logo_path and os.path.exists(logo_path):
        try:
            # Ensure proper scaling for PDF embed
            c.drawImage(logo_path, 50, height - 120, width=80, height=80, preserveAspectRatio=True, mask="auto")
        except Exception:
            # Silently fail if logo cannot be drawn to prevent PDF generation crash
            pass
    c.setFont("Helvetica-Bold", 18)
    c.drawCentredString(width / 2, height - 80, (school.name or "SCHOOL").upper())
    c.setFont("Helvetica", 14)
    c.drawCentredString(width / 2, height - 160, "PAYMENT RECEIPT")
    c.setFont("Helvetica", 12)
    c.drawString(50, 650, f"Student: {payment.student.name}")
    c.drawString(50, 630, f"Reg No: {payment.student.reg_number or 'N/A'}")
    c.drawString(50, 610, f"Class: {payment.student.student_class or 'N/A'}")
    c.drawString(50, 590, f"Payment Type: {payment.payment_type or 'N/A'}")
    c.drawString(50, 570, f"Term: {payment.term or 'N/A'} | Session: {payment.session or 'N/A'}")
    c.drawString(50, 550, f"Amount Paid: ₦{payment.amount_paid:,.2f}")
    c.drawString(50, 530, f"Date: {payment.payment_date.strftime('%Y-%m-%d %I:%M %p')}")

    # Add a footer/signature line
    c.line(50, 200, width - 50, 200)
    c.drawCentredString(width / 2, 180, "This is an electronically generated receipt.")
    c.drawCentredString(width / 2, 160, f"Ref ID: {payment.id}")
    
    c.showPage()
    c.save()
    buffer.seek(0)
    
    filename = f"receipt_{payment.id}_{payment.student.reg_number}.pdf"
    return send_file(
        buffer,
        mimetype="application/pdf",
        as_attachment=True,
        download_name=filename
    )

# ---------------------------
# SETTINGS/PROFILE PAGE
# ---------------------------
@app.route("/settings", methods=["GET"])
@login_required
def settings():
    # Placeholder route to satisfy the 'settings' url_for call in base.html
    school = current_school()
    # You will need to create a settings.html template for this to work correctly
    return render_template("settings.html", school=school)


if __name__ == "__main__":
    with app.app_context():
        # Ensure database and migrations are set up if running locally
        # db.create_all() 
        pass 
    app.run(debug=True)



