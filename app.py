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
import logging
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from dotenv import load_dotenv
from PIL import Image

# Set up logging for better error tracking
logging.basicConfig(level=logging.INFO)

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
    # Setting secure cookie flag based on environment
    SESSION_COOKIE_SECURE = os.environ.get("FLASK_ENV") == "production"
    
    # FIX: Defined UPLOAD_FOLDER and ALLOWED_EXTENSIONS globally
    UPLOAD_FOLDER = os.path.join("static", "logos")
    ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg"}
    
    PAYSTACK_PUBLIC_KEY = os.environ.get("PAYSTACK_PUBLIC_KEY")
    PAYSTACK_SECRET_KEY = os.environ.get("PAYSTACK_SECRET_KEY")
    PAYSTACK_SUBSCRIPTION_AMOUNT = 1000000 # in kobo, for NGN 10,000
    
    TRIAL_LIMIT = 2 # Student count limit enforced after trial expires

app = Flask(__name__)
app.config.from_object(Config)

# Ensure the upload directory exists
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
    # Changed to Date only for simpler comparison
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
    """Decorator to ensure the user is logged in."""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        school = current_school()
        if not school:
            flash("Please log in first.", "warning")
            return redirect(url_for("index"))
        
        # NOTE: Removed complex trial logic here, now handled by @trial_required
        return f(*args, **kwargs)
    return decorated_function

def trial_required(f):
    """
    NEW DECORATOR: Checks if the user's subscription (time-based) has expired.
    If expired, redirects them to the subscription renewal page.
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        school = current_school()
        now = datetime.today().date() # Compare Date fields

        subscription_endpoint = 'pay_with_paystack_subscription'
        
        # Check if the subscription_expiry date is in the past
        if school.subscription_expiry is None or school.subscription_expiry < now:
            # Exempt payment/auth/receipt endpoints from restriction
            unprotected_endpoints = [
                subscription_endpoint, 'paystack_callback', 'logout', 
                'index', 'register', 'payment_receipt', 'generate_receipt'
            ]
            
            if request.endpoint not in unprotected_endpoints:
                flash("Your subscription has expired. Please renew to continue using all features.", "danger")
                return redirect(url_for(subscription_endpoint))
        
        # If not expired, or if accessing an unprotected endpoint, proceed
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
        # This is where a user might intentionally leave the file input blank
        return True 
    if not allowed_file(file.filename):
        flash("Invalid file type. Please upload a PNG or JPG.", "danger")
        return False
    
    # Construct filename using school ID and name, then secure it
    ext = file.filename.rsplit('.', 1)[1].lower()
    # Ensure name is safe for filename
    safe_name = secure_filename(school.name.lower().replace(' ', '_'))
    filename = f"{school.id}_{safe_name}.{ext}"
    file_path = os.path.join(app.config["UPLOAD_FOLDER"], filename)
    
    try:
        file_content = file.read()
        
        # Basic validation using PIL
        with Image.open(BytesIO(file_content)) as img:
            img_format = img.format.upper()
            if img_format not in ("JPEG", "PNG"):
                flash("Invalid image content. File is not a valid JPEG or PNG.", "danger")
                return False
                
        # Save the file
        with open(file_path, "wb") as f:
            f.write(file_content)
            
        school.logo_filename = filename
        db.session.commit()
        flash("Logo uploaded successfully!", "success")
        return True
    except Exception as e:
        app.logger.error(f"Error processing image: {e}")
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
# TEMPLATE FILTERS (for display)
# ---------------------------
@app.template_filter('currency_format')
def currency_format_filter(value_kobo):
    """Formats kobo/cents integer amount into Naira/NGN currency string."""
    if value_kobo is None:
        return "N/A"
    try:
        # Convert integer kobo/cents back to float Naira/Primary Currency
        naira_value = int(value_kobo) / 100.0
        # Format with commas and two decimal places
        return f"₦{naira_value:,.2f}"
    except (ValueError, TypeError):
        return "N/A"

@app.template_filter('naira_format')
def naira_format_filter(value_naira):
    """Formats float Naira/Primary currency unit into Naira/NGN currency string."""
    if value_naira is None:
        return "N/A"
    try:
        # Format with commas and two decimal places
        return f"₦{float(value_naira):,.2f}"
    except (ValueError, TypeError):
        return "N/A"

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
        
        if len(password) < 8:
            flash("Password must be at least 8 characters long.", "danger")
            return redirect(url_for("register"))
            
        hashed_pw = generate_password_hash(password)
        
        # CRITICAL FIX: Give a trial period of exactly 1 day
        initial_expiry = datetime.today().date() + timedelta(days=1) 
        
        school = School(
            name=name,
            email=email,
            password=hashed_pw,
            subscription_expiry=initial_expiry,
        )
        db.session.add(school)
        db.session.commit()
        flash("School registered successfully! Enjoy your 1-day trial.", "success")
        return redirect(url_for("index")) # Redirect to login after successful registration

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
@trial_required # NEW: Enforce time-based trial restriction
def dashboard():
    school = current_school()
    
    total_students = Student.query.filter_by(school_id=school.id).count()
    
    # Total payments made (stored in Naira/Primary Currency)
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
    
    # Calculate Outstanding Balance using Manual Input (in kobo/cents)
    expected_fees_kobo = school.expected_fees_this_term or 0
    outstanding_balance_kobo = expected_fees_kobo - total_payments_kobo
    
    # Ensure the balance is not negative (if the school has been overpaid)
    outstanding_balance_kobo = max(0, outstanding_balance_kobo)
    
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
# SETTINGS/PROFILE PAGE
# ---------------------------
@app.route("/settings", methods=["GET", "POST"])
@login_required
@trial_required # NEW: Enforce time-based trial restriction
def settings():
    school = current_school()

    if request.method == 'POST':
        # 1. Process standard text fields
        school.name = request.form.get('school_name')
        school.email = request.form.get('email')
        school.address = request.form.get('address')
        school.phone_number = request.form.get('phone_number')
        
        # 2. Process Expected Total Fees (convert Naira/Primary back to Kobo/Cents)
        try:
            expected_naira = float(request.form.get('expected_fees_this_term', 0))
            # Rounding to prevent floating point errors before converting to int for kobo
            school.expected_fees_this_term = int(round(expected_naira * 100))
        except ValueError:
            flash("Invalid fee amount entered.", "danger")
            return redirect(url_for('settings'))

        # 3. Handle file upload (Logo)
        if 'logo' in request.files and request.files['logo'].filename != '':
            handle_logo_upload(school) # Use the enhanced helper function

        # 4. Commit standard changes to the database
        db.session.commit()
        flash("School settings updated successfully!", "success")
        
        # Redirect after POST to prevent resubmission on refresh
        return redirect(url_for('settings'))

    # GET request: Render the form
    return render_template("settings.html", school=school)

# ---------------------------
# LOGO UPLOAD (DEPRECATED - now handled in settings)
# ---------------------------
@app.route("/upload_logo", methods=["POST"])
@login_required
@trial_required # NEW: Enforce time-based trial restriction
def upload_logo():
    school = current_school()
    handle_logo_upload(school)
    return redirect(url_for("dashboard"))

# ---------------------------
# STUDENTS (List and inline add)
# ---------------------------
@app.route("/students", methods=["GET", "POST"])
@login_required
@trial_required # NEW: Enforce time-based trial restriction
def students():
    school = current_school()
    
    if request.method == "POST":
        student_count = Student.query.filter_by(school_id=school.id).count()
        subscription_endpoint = 'pay_with_paystack_subscription'
        
        # Student count restriction only prevents POST (adding new students)
        if school.subscription_expiry < datetime.today().date() and student_count >= app.config['TRIAL_LIMIT']:
            flash(f"Your subscription has expired. Please renew to add more than {app.config['TRIAL_LIMIT']} students.", "danger")
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
    # Logic for display banner: trial active if time hasn't expired OR student count is below limit.
    trial_active = school.subscription_expiry >= datetime.today().date() or student_count < app.config['TRIAL_LIMIT']
    
    return render_template("students.html", students=students_list, student_count=student_count, trial_limit=app.config['TRIAL_LIMIT'], trial_active=trial_active)

# ---------------------------
# API ENDPOINTS
# ---------------------------
@app.route("/search-students", methods=["GET"])
@login_required
@trial_required # NEW: Enforce time-based trial restriction
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
@trial_required # NEW: Enforce time-based trial restriction
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
    outstanding_kobo = expected_amount_kobo - total_paid_kobo
    outstanding_kobo = max(0, outstanding_kobo)
        
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
@app.route("/pay-with-paystack-subscription", methods=["GET", "POST"])
@login_required
# NOTE: This route is intentionally NOT wrapped in @trial_required
def pay_with_paystack_subscription():
    school = current_school()
    
    # If the request is a GET, render the page.
    if request.method == "GET":
        # Check if they are already subscribed
        is_subscribed = school.subscription_expiry >= datetime.today().date()
        
        return render_template(
            "subscription.html",
            school=school,
            subscription_amount=app.config['PAYSTACK_SUBSCRIPTION_AMOUNT'] / 100, # Convert kobo to NGN
            today=datetime.today().date(),
            is_subscribed=is_subscribed
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
        app.logger.error(f"Paystack API error during initialization: {e}")
        return jsonify(error=f"Paystack API error: {e}"), 500

@app.route("/paystack/callback", methods=["GET"])
@login_required
# NOTE: This route is intentionally NOT wrapped in @trial_required
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
            flash("Subscription renewed successfully! You now have full access.", "success")
        else:
            flash("Subscription payment failed or was not verified.", "danger")

    except requests.exceptions.RequestException as e:
        app.logger.error(f"Paystack API error during verification: {e}")
        flash(f"Payment verification failed: {e}", "danger")
    
    return redirect(url_for("dashboard")) # Redirect to dashboard after successful payment

@app.route("/add-payment", methods=["GET", "POST"])
@login_required
@trial_required # NEW: Enforce time-based trial restriction
def add_payment():
    school = current_school()
    
    if request.method == "POST":
        student_id = request.form.get("student_id")
        
        # ... (rest of POST logic remains the same)
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
@trial_required # NEW: Enforce time-based trial restriction
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
@trial_required # NEW: Enforce time-based trial restriction
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
@trial_required # NEW: Enforce time-based trial restriction
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
    
    # --- COMPLETED PAGINATION LOGIC ---
    payments_paginated = query.order_by(Payment.payment_date.desc()).paginate(
        page=page, per_page=10, error_out=False
    )
    
    # Collect unique terms and sessions for filter dropdowns
    available_terms = db.session.query(Payment.term).filter(
        Payment.student_id.in_(db.session.query(Student.id).filter_by(school_id=school.id))
    ).distinct().order_by(Payment.term.asc()).all()
    
    available_sessions = db.session.query(Payment.session).filter(
        Payment.student_id.in_(db.session.query(Student.id).filter_by(school_id=school.id))
    ).distinct().order_by(Payment.session.desc()).all()

    return render_template(
        "payments.html",
        payments=payments_paginated,
        search=search,
        selected_term=term,
        selected_session=session_year,
        available_terms=[t[0] for t in available_terms if t[0]],
        available_sessions=[s[0] for s in available_sessions if s[0]]
    )
    
# ---------------------------
# PAYMENT RECEIPT & PDF GENERATION
# ---------------------------
@app.route("/payment-receipt/<int:payment_id>")
@login_required
@trial_required
def payment_receipt(payment_id):
    school = current_school()
    payment = db.session.get(Payment, payment_id)

    if not payment or payment.student.school_id != school.id:
        flash("Payment receipt not found.", "danger")
        return redirect(url_for("payments"))

    return render_template("payment_receipt.html", payment=payment, school=school)

@app.route("/generate-receipt/<int:payment_id>")
@login_required
@trial_required
def generate_receipt(payment_id):
    school = current_school()
    payment = db.session.get(Payment, payment_id)

    if not payment or payment.student.school_id != school.id:
        flash("Payment receipt not found.", "danger")
        return redirect(url_for("payments"))

    # Create a BytesIO buffer to hold the PDF data
    buffer = BytesIO()
    p = canvas.Canvas(buffer, pagesize=A4)
    width, height = A4
    margin = 50

    # --- Draw Receipt ---
    
    # Title Box/Border
    p.setFillColor(colors.lightgrey)
    p.rect(margin, height - 120, width - 2 * margin, 80, fill=1)
    
    # Header
    p.setFillColor(colors.black)
    p.setFont("Helvetica-Bold", 18)
    p.drawCentredString(width / 2, height - 70, f"OFFICIAL PAYMENT RECEIPT")
    p.setFont("Helvetica-Bold", 14)
    p.drawCentredString(width / 2, height - 90, school.name.upper())

    # School Details (Right Side)
    p.setFont("Helvetica", 9)
    p.drawString(width - 150, height - 50, f"Email: {school.email}")
    p.drawString(width - 150, height - 62, f"Phone: {school.phone_number or 'N/A'}")
    p.drawString(width - 150, height - 74, f"Address: {school.address or 'N/A'}")

    # Receipt Number and Date
    p.setFont("Helvetica", 10)
    p.drawString(margin, height - 150, f"Receipt No: {payment.id:06}")
    p.drawString(margin, height - 165, f"Date: {payment.payment_date.strftime('%Y-%m-%d')}")

    # Student Details
    p.setFont("Helvetica-Bold", 12)
    p.drawString(margin, height - 200, "PAYMENT FOR:")
    p.setFont("Helvetica", 12)
    y_pos = height - 220
    p.drawString(margin, y_pos, f"Student Name: {payment.student.name}")
    p.drawString(width / 2, y_pos, f"Reg. No: {payment.student.reg_number}")
    p.drawString(margin, y_pos - 20, f"Class: {payment.student.student_class}")
    p.drawString(width / 2, y_pos - 20, f"For Term: {payment.term} ({payment.session})")

    # Payment Table Header
    table_y = height - 300
    p.setFont("Helvetica-Bold", 12)
    p.setFillColor(colors.darkgreen)
    p.rect(margin, table_y - 20, width - 2 * margin, 20, fill=1)
    p.setFillColor(colors.white)
    p.drawString(margin + 10, table_y - 15, "DESCRIPTION")
    p.drawString(width - 150, table_y - 15, "AMOUNT (NGN)")
    
    # Payment Row
    p.setFillColor(colors.black)
    p.setFont("Helvetica", 12)
    p.drawString(margin + 10, table_y - 45, f"School Fees Payment ({payment.payment_type})")
    
    # Amount (stored as Naira/float)
    amount_str = f"{payment.amount_paid:,.2f}"
    p.drawString(width - 150, table_y - 45, amount_str)
    
    # Total
    p.setStrokeColor(colors.darkgreen)
    p.setLineWidth(2)
    p.line(width - 200, table_y - 65, width - margin, table_y - 65)
    
    p.setFont("Helvetica-Bold", 14)
    p.drawString(margin + 10, table_y - 85, "TOTAL PAID:")
    p.drawString(width - 150, table_y - 85, amount_str)

    # Footer
    p.setFont("Helvetica-Oblique", 10)
    p.setFillColor(colors.grey)
    p.drawString(margin, 50, "This is a computer-generated receipt. Thank you for your payment.")

    p.showPage()
    p.save()

    # Move buffer position to the beginning
    buffer.seek(0)
    
    filename = f"receipt_{payment.student.reg_number}_{payment_id}.pdf"
    
    # Send the PDF file to the client
    return send_file(
        buffer,
        download_name=filename,
        mimetype="application/pdf",
        as_attachment=True
    )

if __name__ == "__main__":
    with app.app_context():
        db.create_all()
    app.run(debug=True)
