import os
import re
import json
import logging
import requests
from io import BytesIO
from datetime import datetime, timedelta
from functools import wraps

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
from reportlab.lib import colors

from dotenv import load_dotenv
from PIL import Image
from sqlalchemy import func


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
# In app.py, add this function after db/migrate initialization, before routes
def get_logo_path(school):
    """
    Returns the URL for the school's logo, or None if no logo is set.
    """
    if school and school.logo_filename:
        # Use url_for to generate the public URL for the browser
        return url_for('static', filename=f'logos/{school.logo_filename}')
    return None
# Ensure the upload directory exists
os.makedirs(app.config["UPLOAD_FOLDER"], exist_ok=True)

db = SQLAlchemy(app)
migrate = Migrate(app, db)

# ---------------------------
# MODELS
# ---------------------------
class School(db.Model):
    __tablename__ = "school"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(150), nullable=False, unique=True)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password = db.Column(db.String(200), nullable=False)
    subscription_expiry = db.Column(db.Date, nullable=False)
    logo_filename = db.Column(db.String(250), nullable=True)
    address = db.Column(db.String(250), nullable=True)
    phone_number = db.Column(db.String(50), nullable=True)
    expected_fees_this_term = db.Column(db.Integer, default=0)

    # Relationship with Student
    students = db.relationship("Student", backref="school", lazy=True)

    # ✅ Relationship with FeeStructure
    fee_structures = db.relationship(
        "FeeStructure",
        back_populates="school",           # Matches FeeStructure.school
        cascade="all, delete-orphan",
        lazy=True
    )

    def __repr__(self):
        return f"<School {self.name}>"

class Student(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(150), nullable=False)
    reg_number = db.Column(db.String(50), nullable=False)
    student_class = db.Column(db.String(50), nullable=False)
    school_id = db.Column(db.Integer, db.ForeignKey("school.id"), nullable=False)
    payments = db.relationship("Payment", backref="student", lazy=True)

class Payment(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    amount_paid = db.Column(db.Float, nullable=False) # Stored in Naira (Float)
    payment_date = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    payment_type = db.Column(db.String(100))
    term = db.Column(db.String(20))
    session = db.Column(db.String(20))
    student_id = db.Column(db.Integer, db.ForeignKey("student.id"), nullable=False)

# NEW MODEL: FeeStructure (UPDATED TO INCLUDE TERM AND SESSION)
class FeeStructure(db.Model):
    __tablename__ = "fee_structure"

    id = db.Column(db.Integer, primary_key=True)
    class_name = db.Column(db.String(50), nullable=False)
    term = db.Column(db.String(20), nullable=True)        # Temporarily allow NULL
    session = db.Column(db.String(20), nullable=True)     # Temporarily allow NULL
    expected_amount = db.Column(db.Integer, nullable=False, default=0)  # Stored in Kobo (₦1.00 = 100)
    school_id = db.Column(db.Integer, db.ForeignKey("school.id"), nullable=False)

    # ✅ Relationship back to School
    school = db.relationship("School", back_populates="fee_structures", lazy=True)

    # ✅ Prevent duplicate entries for same class, term, and session within one school
    __table_args__ = (
        db.UniqueConstraint(
            "school_id", "class_name", "term", "session",
            name="_school_class_term_session_uc"
        ),
    )

    def __repr__(self):
        term_display = self.term or "N/A"
        session_display = self.session or "N/A"
        return f"<FeeStructure {self.class_name} | Term: {term_display} | Session: {session_display}>"

    # Relationship back to the School model (optional but recommended)
    school = db.relationship("School", back_populates="fee_structures", lazy=True)

    # Helper method to format amount neatly for templates
    def formatted_amount(self):
        return f"₦{self.expected_amount / 100:,.2f}"

    def __repr__(self):
        return f"<FeeStructure {self.class_name} ({self.term or 'N/A'}, {self.session or 'N/A'}) - ₦{self.expected_amount / 100:.2f}>"

# ---------------------------
# HELPERS
# ---------------------------

# NOTE: This section assumes the following are defined/imported at the top of app.py:
# import os
# from datetime import datetime
# from functools import wraps
# from io import BytesIO
# from flask import Flask, render_template, request, redirect, url_for, session, send_file, flash, jsonify
# from flask_sqlalchemy import SQLAlchemy (db object is created from this)
# from werkzeug.utils import secure_filename
# from sqlalchemy import func
# from PIL import Image
# And the models (School, Student, Payment, FeeStructure) are accessible.

def current_school():
    """Retrieves the current school object from the database using the session ID."""
    if "school_id" in session:
        # Use .get() which returns None if ID not found, avoiding an exception
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
        return f(*args, **kwargs)
    return decorated_function

def trial_required(f):
    """
    DECORATOR: Checks if the user's subscription (time-based) has expired.
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        school = current_school()
        now = datetime.today().date() # Compare Date fields

        subscription_endpoint = 'pay_with_paystack_subscription'
        
        # Check if the subscription_expiry date is in the past
        if school and (school.subscription_expiry is None or school.subscription_expiry < now):
            # Exempt payment/auth/receipt endpoints from restriction
            unprotected_endpoints = [
                subscription_endpoint, 'paystack_callback', 'logout', 
                'index', 'register', 'receipt_generator_index', 'generate_receipt', 'download_receipt'
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
    """Returns the URL for the school's logo, or None for template use."""
    if school and school.logo_filename:
        # Construct the local path to verify existence before creating a URL
        file_path = os.path.join(app.config["UPLOAD_FOLDER"], school.logo_filename)
        if os.path.exists(file_path):
            # Return relative URL for browser/template use
            return url_for('static', filename=f'logos/{school.logo_filename}')
    return None

def get_logo_local_path(school):
    """
    NEW HELPER: Returns the ABSOLUTE local file path for the logo, or None.
    This is required by ReportLab for PDF generation.
    """
    if school and school.logo_filename:
        # Construct the ABSOLUTE path
        local_path = os.path.join(app.root_path, app.config["UPLOAD_FOLDER"], school.logo_filename)
        if os.path.exists(local_path):
            return local_path
        app.logger.warning(f"Logo file NOT found at local path: {local_path}")
    return None

def get_expected_fee(school_id, student_class, term, session):
    """
    NEW HELPER: Retrieves the expected fee amount based on class, term, and session 
    from FeeStructure. Converts amount from Kobo/Cents (Integer) to Naira (Float).
    """
    fee_record = db.session.execute(
        db.select(FeeStructure.expected_amount).filter_by(
            school_id=school_id,
            class_name=student_class,
            term=term, 
            session=session 
        )
    ).scalar_one_or_none()
    
    # Assumption: expected_amount is stored as Integer (Kobo) and must be divided by 100 for Naira (Float)
    if fee_record is not None:
        return fee_record / 100.0
    return 0.0

def get_total_paid_for_period(student_id, term, session):
    """
    NEW HELPER: Calculates the total amount paid by a student for a specific term and session.
    Returns amount in Naira (Float).
    """
    total = db.session.execute(
        db.select(func.sum(Payment.amount_paid)).filter_by(
            student_id=student_id,
            term=term,
            session=session
        )
    ).scalar_one_or_none()
    
    # Total is already in Naira (Float)
    return total if total is not None else 0.0


def handle_logo_upload(school):
    """Handles file upload, saves the logo, and updates the school record."""
    if "logo" not in request.files:
        flash("No file part in the request.", "danger")
        return False
    file = request.files["logo"]
    if file.filename == '':
        return True # User left the file field blank
    
    if not allowed_file(file.filename):
        flash("Invalid file type. Please upload a PNG or JPG.", "danger")
        return False
    
    # Construct filename using school ID and name, then secure it
    ext = file.filename.rsplit('.', 1)[1].lower()
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
    """Creates a new Payment record and commits it to the database."""
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

def _clean_and_convert_amount(raw_amount):
    """
    Cleans a user-input currency string (like '₦50,000' or '50.000')
    and converts it to naira (float) and kobo (int).

    Returns:
        (expected_amount_kobo, amount_naira)
    Raises:
        ValueError: if input is invalid or zero/negative.
    """
    if not raw_amount:
        raise ValueError("Amount is empty")

    # Remove all characters except digits and dot
    cleaned = re.sub(r"[^\d.]", "", raw_amount)
    if not cleaned:
        raise ValueError("Amount empty after cleaning")

    try:
        # Convert to float (handles both '50.000' and '50,000')
        amount_naira = float(cleaned.replace(",", ""))
    except ValueError:
        raise ValueError(f"Invalid number format: {raw_amount}")

    if amount_naira <= 0:
        raise ValueError("Amount must be greater than zero")

    expected_amount_kobo = int(round(amount_naira * 100))
    return expected_amount_kobo, amount_naira




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
# ERROR HANDLERS
# ---------------------------
@app.errorhandler(500)
def internal_server_error(e):
    """
    Handles internal server errors (500) and renders the 500.html template.
    """
    app.logger.error(f"Internal Server Error: {e}")
    # Assume you have a 500.html template
    return render_template('500.html'), 500

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
@trial_required # Enforce time-based trial restriction
def dashboard():
    school = current_school()
    if not school:
        flash("No school record found. Please log in again.", "danger")
        return redirect(url_for("index")) 

    total_students = Student.query.filter_by(school_id=school.id).count()

    # Total payments made (stored in Naira/Primary Currency)
    total_payments_naira = (
        db.session.query(db.func.sum(Payment.amount_paid))
        .join(Student)
        .filter(Student.school_id == school.id)
        .scalar()
    ) or 0
    total_payments_kobo = int(total_payments_naira * 100)

    recent_payments = (
        Payment.query.join(Student)
        .filter(Student.school_id == school.id)
        .order_by(Payment.payment_date.desc())
        .limit(5)
        .all()
    )

    # Calculate Outstanding Balance using Manual Input (in kobo/cents)
    expected_fees_kobo = school.expected_fees_this_term or 0
    outstanding_balance_kobo = expected_fees_kobo - total_payments_kobo
    outstanding_balance_kobo = max(0, outstanding_balance_kobo)

    # Subscription status
    subscription_active = school.subscription_expiry >= datetime.today().date() # Check against expiry date

    return render_template(
        "dashboard.html",
        school=school,
        subscription_active=subscription_active,
        total_students=total_students,
        total_payments=total_payments_kobo,
        outstanding_balance=outstanding_balance_kobo,
        recent_payments=recent_payments,
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

@app.route("/student/<int:student_id>/payments", methods=["GET"])
@login_required
@trial_required
def get_student_payments(student_id):
    """API endpoint to fetch all payments for a specific student."""
    school = current_school()
    student = db.session.get(Student, student_id)
    
    if not student or student.school_id != school.id:
        # Return an empty array instead of a 404 error if student is not found or access denied
        app.logger.warning(f"Access denied for student ID: {student_id} or student not found.")
        return jsonify(payments=[]), 200

    payments = Payment.query.filter_by(student_id=student_id).order_by(Payment.payment_date.desc()).all()
    
    payments_data = [{
        "id": p.id,
        "amount_paid": p.amount_paid,
        "date": p.payment_date.isoformat(), # Use ISO format for JS compatibility
        "term": p.term,
        "session": p.session
    } for p in payments]
    
    return jsonify(payments=payments_data)

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

# ---------------------------
# PAYMENTS ROUTES (UPDATED FOR FILTERING AND PAGINATION)
# ---------------------------
@app.route("/payments")
@login_required
@trial_required
def list_payments():
    school = current_school()
    
    # --- 1. Get Query Parameters from URL ---
    page = request.args.get('page', 1, type=int)
    per_page = 10 # Define how many items per page
    
    # Filters
    search = request.args.get('search', '').strip()
    term = request.args.get('term', '').strip()
    session_year = request.args.get('session', '').strip()

    # --- 2. Build Base Query ---
    # Start with all payments belonging to the current school, joining Student to filter
    query = Payment.query.join(Student).filter(Student.school_id == school.id)

    # --- Apply Filters ---
    
    # 2a. Search Filter (by student name or registration number)
    if search:
        query = query.filter(
            db.or_(
                Student.name.ilike(f"%{search}%"),
                Student.reg_number.ilike(f"%{search}%")
            )
        )

    # 2b. Term Filter
    if term:
        query = query.filter(Payment.term == term)

    # 2c. Session Filter
    if session_year:
        query = query.filter(Payment.session.ilike(f"%{session_year}%"))

    # --- 3. Apply Ordering and Pagination ---
    query = query.order_by(Payment.payment_date.desc())
    
    # Paginate the final result
    pagination = query.paginate(page=page, per_page=per_page, error_out=False)
    
    # --- 4. Render Template ---
    return render_template(
        "payments_list.html",
        payments=pagination.items,
        pagination=pagination,
        # Pass the search parameters back to the template for use in pagination links
        search=search,
        term=term,
        session_year=session_year
    )

@app.route("/add-payment", methods=["GET", "POST"])
@login_required
@trial_required # NEW: Enforce time-based trial restriction
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
                        # Fixed redirect URL to use 'generate_receipt'
                        "redirect_url": url_for("generate_receipt", payment_id=new_payment.id) 
                    }), 200 
                
                # Standard (non-AJAX) success path
                flash("Payment added successfully", "success")
                # Fixed redirect URL to use 'generate_receipt'
                return redirect(url_for("generate_receipt", payment_id=new_payment.id))

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

    return render_template("add_payment_global.html", student=student_to_prefill)


# ---------------------------
# RECEIPT GENERATION ROUTES
# ---------------------------

@app.route("/receipts", endpoint="receipt_generator_index")
@login_required
@trial_required
def receipt_generator_index():
    """
    Renders the interactive search page (receipt_index.html)
    used to select a student and view their payments.
    """
    return render_template("receipt_index.html")


@app.route("/receipt/view/<int:payment_id>", endpoint="generate_receipt")
@login_required
@trial_required
def generate_receipt(payment_id):
    """
    Generates and displays the HTML preview of the receipt.
    """
    school = current_school()
    payment = db.session.get(Payment, payment_id)

    # 1. Validation and Redirect fix
    if not payment or payment.student.school_id != school.id:
        flash("Payment not found or access denied.", "danger")
        return redirect(url_for("receipt_generator_index"))

    student = payment.student

    # 2. Reverting Fee Structure query to include term/session
    fee_structure = FeeStructure.query.filter_by(
        school_id=school.id,
        class_name=student.student_class,
        term=payment.term,
        session=payment.session
    ).first()
    
    # Convert expected amount from kobo/cents to Naira
    expected_amount_naira = (float(fee_structure.expected_amount) / 100.0) if fee_structure else 0.0

    # 3. Calculate total paid for this term/session (in kobo/cents)
    total_paid_kobo_query = db.session.query(db.func.sum(Payment.amount_paid)).filter(
        Payment.student_id == student.id,
        Payment.term == payment.term,
        Payment.session == payment.session
    ).scalar() or 0
    
    # Convert total paid amount to Naira
    total_paid_naira = float(total_paid_kobo_query) / 100.0

    # 4. Calculate outstanding balance
    outstanding_balance_naira = max(0.0, expected_amount_naira - total_paid_naira)

    # 5. Render the receipt preview (Error here fixed by adding receipt_view.html below)
    return render_template(
        "receipt_view.html",
        school=school,
        payment=payment,
        student=student,
        expected_amount=expected_amount_naira,
        total_paid=total_paid_naira,
        outstanding_balance=outstanding_balance_naira,
        logo_path=get_logo_path(school)
    )


@app.route("/receipt/download/<int:payment_id>", endpoint="download_receipt")
@login_required
@trial_required
def download_receipt(payment_id):
    """Generates and downloads a PDF receipt."""
    school = current_school()
    payment = db.session.get(Payment, payment_id)

    # 1. Validation and Redirect fix
    if not payment or payment.student.school_id != school.id:
        flash("Payment not found or access denied.", "danger")
        return redirect(url_for("receipt_generator_index"))

    student = payment.student
    buffer = BytesIO()
    c = canvas.Canvas(buffer, pagesize=A4)
    width, height = A4

    # 2. Reverting Fee Structure query to include term/session
    fee_structure = FeeStructure.query.filter_by(
        school_id=school.id,
        class_name=student.student_class,
        term=payment.term,
        session=payment.session
    ).first()

    # Convert expected amount from kobo/cents to Naira
    expected_amount = (float(fee_structure.expected_amount) / 100.0) if fee_structure else 0.0

    # 3. Calculate total paid for this term/session (in kobo/cents)
    total_paid_kobo = db.session.query(db.func.sum(Payment.amount_paid)).filter(
        Payment.student_id == student.id,
        Payment.term == payment.term,
        Payment.session == payment.session
    ).scalar() or 0

    # Convert total paid amount to Naira
    total_paid = float(total_paid_kobo) / 100.0
    outstanding_balance = max(0.0, expected_amount - total_paid)

    # 4. Draw PDF elements
    # Define layout constants
    LOGO_MARGIN_X = 50
    TEXT_START_X = 150 
    LOGO_WIDTH = 80
    LOGO_HEIGHT = 80
    TOP_Y_POS = height - 20 

    # --- School Logo ---
    logo_path = None
    if school.logo_filename:
        # Reconstruct path using os.path.join and secure_filename
        try:
            logo_path = os.path.join(app.root_path, app.config["UPLOAD_FOLDER"], secure_filename(school.logo_filename))
        except NameError:
             # Fallback if app/config aren't accessible
             logo_path = school.logo_filename 
        
        if not os.path.exists(logo_path):
            logo_path = None

    if logo_path:
        try:
            c.drawImage(
                logo_path, 
                LOGO_MARGIN_X, 
                TOP_Y_POS - LOGO_HEIGHT, 
                width=LOGO_WIDTH, 
                height=LOGO_HEIGHT, 
                preserveAspectRatio=True, 
                anchor='n'
            )
        except Exception as e:
            logging.error(f"Failed to draw logo onto PDF: {e}")
            
    # Title and School Info
    c.setFont("Helvetica-Bold", 16)
    c.drawString(TEXT_START_X, height - 50, "Official School Fee Receipt")
    
    c.setFont("Helvetica", 10)
    c.drawString(TEXT_START_X, height - 70, f"School: {school.name}")
    c.drawString(TEXT_START_X, height - 85, f"Address: {school.address or 'N/A'}")
    c.drawString(TEXT_START_X, height - 100, f"Phone: {school.phone_number or 'N/A'}")
    
    # Receipt Details
    c.setFont("Helvetica", 12)
    c.drawString(400, height - 70, f"Receipt No: {payment.id}")
    c.drawString(400, height - 85, f"Date: {payment.payment_date.strftime('%Y-%m-%d')}")
    
    # Student Details
    y_pos = height - 150 # <-- FIX: y_pos is now defined here!
    c.setFont("Helvetica-Bold", 12)
    c.drawString(50, y_pos, "--- Student Details ---")
    c.setFont("Helvetica", 10)
    c.drawString(50, y_pos - 20, f"Name: {student.name}")
    c.drawString(50, y_pos - 35, f"Reg. No: {student.reg_number}")
    c.drawString(50, y_pos - 50, f"Class: {student.student_class}")

    # Payment Details
    y_pos -= 80
    c.setFont("Helvetica-Bold", 12)
    c.drawString(50, y_pos, "--- Payment Information ---")
    c.setFont("Helvetica", 10)
    c.drawString(50, y_pos - 20, f"Term: {payment.term}")
    c.drawString(50, y_pos - 35, f"Session: {payment.session}")
    c.drawString(50, y_pos - 50, f"Payment Type: {payment.payment_type}")
    
    # Amount Details (Current Payment)
    # Keeping the TEMPORARY FIX: NO DIVISION BY 100.0
    current_amount_naira = float(payment.amount_paid) 
    current_amount_str = f"₦{current_amount_naira:,.2f}"
    
    c.setFillColor(colors.green)
    c.setFont("Helvetica-Bold", 14)
    c.drawString(50, y_pos - 80, "Amount Received:")
    c.drawString(200, y_pos - 80, current_amount_str) # This line now works
    c.setFillColor(colors.black)

    # Financial Summary
    summary_y_pos = y_pos - 120 
    
    c.setFont("Helvetica-Bold", 12)
    c.drawString(50, summary_y_pos, "--- Account Status for Period ---")
    
    c.setFont("Helvetica", 10)
    c.drawString(50, summary_y_pos - 20, "Expected Fee:")
    c.drawString(200, summary_y_pos - 20, f"₦{expected_amount:,.2f}") 
    
    c.drawString(50, summary_y_pos - 40, "Total Paid to Date:")
    c.drawString(200, summary_y_pos - 40, f"₦{total_paid:,.2f}") 
    
    c.setFont("Helvetica-Bold", 12)
    if outstanding_balance > 0:
        c.setFillColor(colors.red)
    else:
        c.setFillColor(colors.black)

    c.drawString(50, summary_y_pos - 60, "Outstanding Balance:")
    c.drawString(200, summary_y_pos - 60, f"₦{outstanding_balance:,.2f}")
    c.setFillColor(colors.black)

    # Footer/Signature
    c.setFont("Helvetica-Oblique", 10)
    c.drawString(50, 50, "This is an electronically generated receipt and requires no signature.")
    
    c.showPage()
    c.save()
    buffer.seek(0)
    
    filename = f"receipt_{payment.id}_{student.reg_number}.pdf"
    
    return send_file(
        buffer,
        as_attachment=True,
        download_name=filename,
        mimetype='application/pdf'
    )

# ---------------------------
# FEE STRUCTURE ROUTES (Create, Read, Update)
# ---------------------------
@app.route("/fee-structure", methods=["GET", "POST"])
@login_required
@trial_required
def fee_structure():
    school = current_school()

    if request.method == "POST":
        
        # 🧾 Gather and sanitize fields
        class_name = request.form.get("class_name", "").strip()
        term = request.form.get("term", "").strip()
        session_ = request.form.get("session", "").strip()
        raw_amount = request.form.get("amount", "").strip()

        app.logger.info(f"[FEE STRUCTURE] Received form data -> "
                        f"class_name='{class_name}', term='{term}', session='{session_}', amount='{raw_amount}'")

        # 🚫 Validate required fields
        if not class_name or not term or not session_ or not raw_amount:
            flash("All fields (Class, Term, Session, Amount) are required.", "danger")
            return redirect(url_for("fee_structure"))

        # 💰 Clean & convert amount using helper
        try:
            expected_amount_kobo, amount_naira = _clean_and_convert_amount(raw_amount)
            app.logger.info(f"[FEE STRUCTURE] Parsed amount: ₦{amount_naira:,.2f} ({expected_amount_kobo} kobo)")
        except (ValueError, TypeError) as e:
            app.logger.error(f"[FEE STRUCTURE] Amount conversion failed: {e} | Raw input: '{raw_amount}'")
            flash("Invalid amount entered. Please use a numeric value greater than zero.", "danger")
            return redirect(url_for("fee_structure"))

        # 🔍 Check if a fee structure already exists for this class, term, and session (UPSERT key)
        existing_fee = FeeStructure.query.filter_by(
            school_id=school.id,
            class_name=class_name,
            term=term,
            session=session_
        ).first()

        try:
            # 🏗️ Update or create the record
            if existing_fee:
                existing_fee.expected_amount = expected_amount_kobo
                db.session.commit()
                flash(f"Fee structure for {class_name} ({term}, {session_}) updated successfully.", "success")
                app.logger.info(f"[FEE STRUCTURE] Updated Fee ID {existing_fee.id}: {class_name}, {term}, {session_}")
            else:
                new_fee = FeeStructure(
                    school_id=school.id,
                    class_name=class_name,
                    term=term,
                    session=session_,
                    expected_amount=expected_amount_kobo,
                )
                db.session.add(new_fee)
                db.session.commit()
                flash(f"Fee structure for {class_name} ({term}, {session_}) added successfully.", "success")
                app.logger.info(f"[FEE STRUCTURE] Created new Fee ID {new_fee.id}: {class_name}, {term}, {session_}")

        except Exception as e:
            db.session.rollback()
            app.logger.error(f"[FEE STRUCTURE FAILED] Database commit error by user {current_user.id}: {e}")
            flash("A database error occurred while saving the fee structure.", "danger")

        return redirect(url_for("fee_structure"))

    # 📊 Display all fee structures for this school (GET request)
    fees = FeeStructure.query.filter_by(school_id=school.id).order_by(FeeStructure.id.desc()).all()
    app.logger.info(f"[FEE STRUCTURE] Displaying {len(fees)} records for school_id={school.id}")

    # NOTE: You need a 'fee_structure.html' template for this line to work.
    return render_template("fee_structure.html", fees=fees)

@app.route("/delete-fee-structure/<int:id>", methods=["POST"])
@login_required
@trial_required
def delete_fee_structure(id):
    from app import db, FeeStructure, app
    from flask import flash, redirect, url_for
    # current_user is imported in the actual app for logging context

    school = current_school() 

    # 1. Fetch the fee structure, ensuring it belongs to the current school for security.
    fee_to_delete = FeeStructure.query.filter_by(id=id, school_id=school.id).first()

    if not fee_to_delete:
        app.logger.warning(
            f"[DELETE FEE FAILED] User attempted to delete non-existent or unauthorized fee ID {id} for school {school.id}"
        )
        flash("Fee structure not found or unauthorized.", "danger")
    else:
        try:
            class_name = fee_to_delete.class_name
            
            # 2. Delete the record and commit
            db.session.delete(fee_to_delete)
            db.session.commit()
            
            # 3. Success feedback and audit log
            flash(f"Fee structure for class '{class_name}' deleted successfully.", "success")
            app.logger.info(
                f"[DELETE FEE SUCCESS] School {school.id} deleted fee structure ID {id} (Class: {class_name})."
            )
            
        except Exception as e:
            # 4. Error handling and rollback
            db.session.rollback()
            app.logger.error(
                f"[DELETE FEE FAILED] Database error deleting fee ID {id} for school {school.id}: {e}"
            )
            flash("An unexpected database error occurred during deletion.", "danger")

    return redirect(url_for("fee_structure"))


if __name__ == "__main__":
    with app.app_context():
        # Ensure database tables are created before running
        db.create_all()
    # Use 0.0.0.0 for Render compatibility
    app.run(host='0.0.0.0', port=os.environ.get('PORT', 5000), debug=True)

































