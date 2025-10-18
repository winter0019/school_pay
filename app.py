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
    session, send_file, flash, jsonify, current_app
)
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename

from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import cm # Added for easier dimensioning

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
    SECRET_KEY = os.environ.get("SECRET_KEY", "default-insecure-key-change-me") # Added a default for local dev
    if SECRET_KEY == "default-insecure-key-change-me":
        logging.warning("SECRET_KEY is using a default value. Change this for production.")
        
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = "Lax"
    # Setting secure cookie flag based on environment
    SESSION_COOKIE_SECURE = os.environ.get("FLASK_ENV") == "production"
    
    # FIX: Defined UPLOAD_FOLDER and ALLOWED_EXTENSIONS globally
    UPLOAD_FOLDER = os.path.join("static", "logos")
    ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg"}
    
    # Placeholder for a live environment. Paystack keys must be set.
    PAYSTACK_PUBLIC_KEY = os.environ.get("PAYSTACK_PUBLIC_KEY")
    PAYSTACK_SECRET_KEY = os.environ.get("PAYSTACK_SECRET_KEY")
    PAYSTACK_SUBSCRIPTION_AMOUNT = 1000000 # in kobo, for NGN 10,000

    
    # Student count limit enforced after trial expires
    TRIAL_LIMIT = 2 

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
    __tablename__ = "school"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(150), nullable=False, unique=True)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password = db.Column(db.String(200), nullable=False)
    # subscription_expiry is a Date object (not DateTime)
    subscription_expiry = db.Column(db.Date, nullable=False) 
    logo_filename = db.Column(db.String(250), nullable=True)
    address = db.Column(db.String(250), nullable=True)
    phone_number = db.Column(db.String(50), nullable=True)
    # Expected fees are stored in Kobo (Integer)
    expected_fees_this_term = db.Column(db.Integer, default=0) 

    # Relationship with Student
    students = db.relationship("Student", backref="school", lazy=True)

    # Relationship with FeeStructure
    fee_structures = db.relationship(
        "FeeStructure",
        back_populates="school",           
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
    # Amount is stored in Naira (Float)
    amount_paid = db.Column(db.Float, nullable=False) 
    payment_date = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    payment_type = db.Column(db.String(100))
    term = db.Column(db.String(20))
    session = db.Column(db.String(20))
    student_id = db.Column(db.Integer, db.ForeignKey("student.id"), nullable=False)
    paystack_ref = db.Column(db.String(100), nullable=True) # Added for subscription payments

# FeeStructure model (UPDATED TO INCLUDE TERM AND SESSION)
class FeeStructure(db.Model):
    __tablename__ = "fee_structure"

    id = db.Column(db.Integer, primary_key=True)
    class_name = db.Column(db.String(50), nullable=False)
    term = db.Column(db.String(20), nullable=False)     # Now NON-NULLABLE
    session = db.Column(db.String(20), nullable=False)    # Now NON-NULLABLE
    # Expected amount is stored in Kobo (Integer)
    expected_amount = db.Column(db.Integer, nullable=False, default=0)  
    school_id = db.Column(db.Integer, db.ForeignKey("school.id"), nullable=False)

    # Relationship back to School
    school = db.relationship("School", back_populates="fee_structures", lazy=True)

    # Prevent duplicate entries for same class, term, and session within one school
    __table_args__ = (
        db.UniqueConstraint(
            "school_id", "class_name", "term", "session",
            name="_school_class_term_session_uc"
        ),
    )

    # Helper method to format amount neatly for templates
    def formatted_amount(self):
        return f"₦{self.expected_amount / 100:,.2f}"

    def __repr__(self):
        return f"<FeeStructure {self.class_name} | Term: {self.term} | Session: {self.session}>"

# ---------------------------
# HELPERS
# ---------------------------

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
    Allows access to payment-related endpoints even when expired.
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        school = current_school()
        now = datetime.today().date() # Compare Date fields

        subscription_endpoint = 'pay_with_paystack_subscription'
        
        # Check if the subscription_expiry date is in the past
        if school and (school.subscription_expiry is None or school.subscription_expiry < now):
            # Define endpoints that MUST be accessible even when expired
            unprotected_endpoints = [
                subscription_endpoint, 'paystack_callback', 'logout',  
                'index', 'register', 'receipt_generator_index', 'generate_receipt', 'download_receipt',
                'student_details' # Allow viewing of details to select a payment for receipt
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
        file_path = os.path.join(app.config["UPLOAD_FOLDER"], school.logo_filename)
        if os.path.exists(file_path):
            return url_for('static', filename=f'logos/{school.logo_filename}')
    return None

def get_logo_local_path(school):
    """
    Returns the ABSOLUTE local file path for the logo, or None.
    Required by ReportLab for PDF generation.
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
    Retrieves the expected fee amount from FeeStructure. 
    Returns amount in Naira (Float).
    """
    fee_record = db.session.execute(
        db.select(FeeStructure.expected_amount).filter_by(
            school_id=school_id,
            class_name=student_class,
            term=term, 
            session=session 
        )
    ).scalar_one_or_none()
    
    # expected_amount is stored as Integer (Kobo) and must be divided by 100 for Naira (Float)
    if fee_record is not None:
        return fee_record / 100.0
    return 0.0

def get_total_paid_for_period(student_id, term, session):
    """
    Calculates the total amount paid by a student for a specific term and session.
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
        # Use get float to handle both 'amount' (from Paystack) and 'amount_paid' (from manual form)
        amount = float(form_data.get("amount") or form_data.get("amount_paid", 0.0))
        if amount <= 0:
            flash("Amount must be greater than zero.", "danger")
            return None
    except (TypeError, ValueError):
        flash("Invalid amount.", "danger")
        return None
    
    term = form_data.get("term", "").strip()
    session_year = form_data.get("session", "").strip()
    payment_type = form_data.get("payment_type", "Manual").strip()
    
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
    and converts it to kobo (int) and naira (float).

    Returns:
        (expected_amount_kobo, amount_naira)
    Raises:
        ValueError: if input is invalid or zero/negative.
    """
    if not raw_amount:
        raise ValueError("Amount is empty")

    # Remove all characters except digits and dot
    cleaned = re.sub(r"[^\d.]", "", str(raw_amount))
    if not cleaned:
        raise ValueError("Amount empty after cleaning")

    try:
        # Convert to float (handles comma separation if cleaned correctly)
        amount_naira = float(cleaned)
    except ValueError:
        raise ValueError(f"Invalid number format: {raw_amount}")

    if amount_naira <= 0:
        raise ValueError("Amount must be greater than zero")

    expected_amount_kobo = int(round(amount_naira * 100))
    return expected_amount_kobo, amount_naira

def calculate_total_outstanding_dynamic(school):
    """
    Calculates the total outstanding balance across all students.
    
    Dynamically sums all expected fees (Kobo -> Naira) and subtracts all total payments (Naira).
    Returns the result in Naira (float).
    """
    total_outstanding_naira = 0.0
    students = Student.query.filter_by(school_id=school.id).all()
    
    for student in students:
        # 1. Get ALL Expected Fees for this student's class
        fee_structures = FeeStructure.query.filter(
            FeeStructure.school_id == school.id,
            FeeStructure.class_name.ilike(student.student_class)
        ).all()
        
        total_expected_naira = 0.0
        for fee in fee_structures:
            # Expected Fee is stored in KOBO, so divide by 100.0 to get Naira
            total_expected_naira += float(fee.expected_amount) / 100.0

        # 2. Get ALL Payments made by this student (Payments stored in Naira)
        total_paid_naira = db.session.query(db.func.sum(Payment.amount_paid)).filter(
            Payment.student_id == student.id
        ).scalar() or 0
        total_paid_naira = float(total_paid_naira)
        
        # 3. Calculate individual outstanding (Only accumulate positive balances)
        outstanding_naira = total_expected_naira - total_paid_naira
        
        # Only add to total outstanding if the balance is positive (they owe money)
        if outstanding_naira > 0:
            total_outstanding_naira += outstanding_naira

    return total_outstanding_naira

def generate_pdf_receipt(payment_id):
    """
    Generates a PDF receipt for a specific payment using ReportLab.
    Returns a BytesIO buffer containing the PDF data.
    """
    payment = db.session.get(Payment, payment_id)
    if not payment:
        return None

    student = payment.student
    school = student.school
    
    buffer = BytesIO()
    p = canvas.Canvas(buffer, pagesize=A4)
    width, height = A4
    
    # --- Settings ---
    TITLE_FONT = 18
    HEADER_FONT = 12
    BODY_FONT = 10
    MARGIN = 50
    LINE_HEIGHT = 16
    
    # --- Header (School Info & Logo) ---
    y_position = height - MARGIN
    
    # Logo
    logo_path = get_logo_local_path(school)
    if logo_path:
        # Draw the logo, resized to fit a small area (e.g., 50x50 units)
        p.drawImage(logo_path, MARGIN, y_position - 50, width=50, height=50, preserveAspectRatio=True, mask='auto')

    # School Name (Centered)
    p.setFont("Helvetica-Bold", TITLE_FONT)
    p.drawCentredString(width / 2, y_position, f"{school.name.upper()} OFFICIAL RECEIPT")
    y_position -= TITLE_FONT + 10

    # School Contact Info (Aligned Right)
    p.setFont("Helvetica", BODY_FONT)
    
    info_lines = [
        f"Address: {school.address or 'N/A'}",
        f"Phone: {school.phone_number or 'N/A'}",
        f"Email: {school.email}"
    ]
    
    for line in info_lines:
        p.drawRightString(width - MARGIN, y_position, line)
        y_position -= LINE_HEIGHT

    # Line separator
    y_position -= 10
    p.line(MARGIN, y_position, width - MARGIN, y_position)
    y_position -= 20
    
    # --- Receipt Details ---
    # Top Left (Receipt Info)
    p.setFont("Helvetica-Bold", HEADER_FONT)
    p.drawString(MARGIN, y_position, "Receipt Details")
    y_position -= LINE_HEIGHT * 1.5
    
    p.setFont("Helvetica", BODY_FONT)
    receipt_data = [
        ("Receipt ID:", str(payment.id)),
        ("Payment Date:", payment.payment_date.strftime("%d-%b-%Y %H:%M")),
        ("Reference/Type:", payment.payment_type),
        ("Term/Session:", f"{payment.term} / {payment.session}"),
    ]
    
    start_y = y_position
    for label, value in receipt_data:
        p.setFont("Helvetica-Bold", BODY_FONT)
        p.drawString(MARGIN, start_y, label)
        p.setFont("Helvetica", BODY_FONT)
        p.drawString(MARGIN + 120, start_y, value)
        start_y -= LINE_HEIGHT
    
    # --- Student Details ---
    start_y = y_position
    p.setFont("Helvetica-Bold", HEADER_FONT)
    p.drawString(width / 2, start_y + LINE_HEIGHT * 1.5, "Student Details")
    start_y -= LINE_HEIGHT * 1.5
    
    p.setFont("Helvetica", BODY_FONT)
    student_data = [
        ("Student Name:", student.name),
        ("Registration No:", student.reg_number),
        ("Class:", student.student_class),
    ]

    for label, value in student_data:
        p.setFont("Helvetica-Bold", BODY_FONT)
        p.drawString(width / 2, start_y, label)
        p.setFont("Helvetica", BODY_FONT)
        p.drawString(width / 2 + 100, start_y, value)
        start_y -= LINE_HEIGHT
    
    y_position = start_y - 20
    
    # --- Financial Summary (Table) ---
    p.line(MARGIN, y_position, width - MARGIN, y_position)
    y_position -= 10
    
    # Calculate balance details for the payment's term/session
    expected_fee = get_expected_fee(school.id, student.student_class, payment.term, payment.session)
    total_paid = get_total_paid_for_period(student.id, payment.term, payment.session)
    balance = max(0.0, expected_fee - total_paid)

    p.setFont("Helvetica-Bold", HEADER_FONT)
    p.drawString(MARGIN, y_position, "FINANCIAL SUMMARY")
    y_position -= 20

    # Table Headers
    col_x = [MARGIN, width / 2, width - MARGIN - 100, width - MARGIN]
    p.setFont("Helvetica-Bold", BODY_FONT)
    p.drawString(col_x[0], y_position, "Description")
    p.drawRightString(col_x[3], y_position, "Amount (₦)")
    y_position -= LINE_HEIGHT
    
    # Amount Paid (Highlighting the current payment)
    p.setFont("Helvetica", BODY_FONT)
    p.drawString(col_x[0], y_position, "Fee Payment")
    p.drawRightString(col_x[3], y_position, f"{payment.amount_paid:,.2f}")
    y_position -= LINE_HEIGHT

    # Separator
    y_position -= 5
    p.line(MARGIN + 350, y_position, width - MARGIN, y_position)
    y_position -= 15
    
    # Summary Rows
    summary_rows = [
        ("Expected Fee:", expected_fee),
        ("Total Paid (Term/Session):", total_paid),
        ("Current Balance Due:", balance),
    ]

    p.setFont("Helvetica-Bold", BODY_FONT)
    for label, value in summary_rows:
        # Use different color for outstanding balance
        if "Balance Due" in label and value > 0:
            p.setFillColor(colors.red)
        elif "Balance Due" in label and value == 0:
            p.setFillColor(colors.green)
        
        p.drawString(col_x[0], y_position, label)
        p.drawRightString(col_x[3], y_position, f"{value:,.2f}")
        p.setFillColor(colors.black) # Reset color
        y_position -= LINE_HEIGHT
        
    # --- Footer ---
    y_position -= 40
    p.setFont("Helvetica-Oblique", BODY_FONT)
    p.drawCentredString(width / 2, MARGIN + 20, "Thank you for your prompt payment.")
    p.drawRightString(width - MARGIN, MARGIN, "Authorized Signature")
    
    p.showPage()
    p.save()
    buffer.seek(0)
    return buffer

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
    # Note: Assuming '500.html' exists. Providing a basic message here for completeness.
    return render_template('500.html', error=e), 500

# ---------------------------
# AUTH
# ---------------------------
@app.route("/", methods=["GET", "POST"])
def index():
    if current_school():
        return redirect(url_for("dashboard"))

    if request.method == "POST":
        email = request.form.get("email", "").strip()
        password = request.form.get("password", "")
        school = School.query.filter_by(email=email).first()

        if school and check_password_hash(school.password, password):
            session["school_id"] = school.id
            flash("Login successful!", "success")
            return redirect(url_for("dashboard"))
        else:
            flash("Invalid email or password.", "danger")
            
    return render_template("index.html")

@app.route("/register", methods=["GET", "POST"])
def register():
    if request.method == "POST":
        name = request.form.get("school_name", "").strip()
        email = request.form.get("email", "").strip()
        password = request.form.get("password", "")
        
        # Check for existing school by email OR name
        if School.query.filter((School.email == email) | (School.name == name)).first():
            flash("School name or email already registered!", "danger")
            return redirect(url_for("register"))
            
        if len(password) < 8:
            flash("Password must be at least 8 characters long.", "danger")
            return redirect(url_for("register"))
            
        hashed_pw = generate_password_hash(password)
        
        # KEY UPDATE: Give a trial period of exactly 1 day from today
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
@trial_required
def dashboard():
    school = current_school()
    if not school:
        flash("No school record found. Please log in again.", "danger")
        return redirect(url_for("index"))

    # Placeholder for current term and session (should be configurable in a real app)
    current_term, current_session = "Third Term", "2025/2026"

    total_students = Student.query.filter_by(school_id=school.id).count()

    # 1. Calculate Payments This Term
    payments_this_term_naira = (
        db.session.query(db.func.sum(Payment.amount_paid))
        .join(Student)
        .filter(
            Student.school_id == school.id,
            Payment.term == current_term,
            Payment.session == current_session
        )
        .scalar()
    ) or 0
    # Convert payments from Naira (Float) to Kobo (Integer) for template display
    payments_this_term_kobo = int(float(payments_this_term_naira) * 100)

    # 2. Calculate Outstanding Balance
    total_outstanding_naira = calculate_total_outstanding_dynamic(school)
    # Convert final outstanding balance to KOBO for template display
    outstanding_balance_kobo = int(round(total_outstanding_naira * 100))

    # 3. Recent Payments
    recent_payments = (
        Payment.query.join(Student)
        .filter(Student.school_id == school.id)
        .order_by(Payment.payment_date.desc())
        .limit(5)
        .all()
    )

    # KEY UPDATE: Check if the subscription is active based on the expiry date
    subscription_active = school.subscription_expiry >= datetime.today().date()

    return render_template(
        "dashboard.html",
        school=school,
        subscription_active=subscription_active,
        total_students=total_students,
        total_payments=payments_this_term_kobo, 
        outstanding_balance=outstanding_balance_kobo,
        recent_payments=recent_payments,
        current_term=current_term, # Pass placeholder for display
        current_session=current_session # Pass placeholder for display
    )


# ---------------------------
# SETTINGS/PROFILE PAGE
# ---------------------------
@app.route("/settings", methods=["GET", "POST"])
@login_required
@trial_required
def settings():
    school = current_school()

    if request.method == 'POST':
        # 1. Process standard text fields
        school.name = request.form.get('school_name')
        school.email = request.form.get('email')
        school.address = request.form.get('address')
        school.phone_number = request.form.get('phone_number')
        
        # 2. Process Expected Total Fees 
        try:
            # Expected fee input is in Naira
            expected_naira = float(request.form.get('expected_fees_this_term') or 0.0) 
            
            # Rounding to prevent floating point errors before converting to int for kobo
            school.expected_fees_this_term = int(round(expected_naira * 100))
        except ValueError:
            flash("Invalid fee amount entered.", "danger")
            return redirect(url_for('settings'))

        # 3. Handle file upload (Logo)
        if 'logo' in request.files and request.files['logo'].filename != '':
            if not handle_logo_upload(school):
                 # If logo upload failed, stop and return
                 return redirect(url_for('settings'))

        # 4. Commit standard changes to the database
        db.session.commit()
        flash("School settings updated successfully!", "success")
        
        # Redirect after POST to prevent resubmission on refresh
        return redirect(url_for('settings'))

    # GET request: Render the form
    # Convert stored Kobo back to Naira for display
    expected_fees_naira = float(school.expected_fees_this_term or 0) / 100.0
    return render_template("settings.html", school=school, expected_fees_naira=expected_fees_naira)

# ---------------------------
# STUDENTS (List and inline add)
# ---------------------------
@app.route("/students", methods=["GET", "POST"])
@login_required
@trial_required
def students():
    school = current_school()
    
    if request.method == "POST":
        student_count = Student.query.filter_by(school_id=school.id).count()
        subscription_endpoint = 'pay_with_paystack_subscription'
        
        # KEY UPDATE: Enforce the student count limit after the trial expiry date
        if school.subscription_expiry < datetime.today().date() and student_count >= current_app.config['TRIAL_LIMIT']:
            flash(f"Your subscription has expired. Please renew to add more than {current_app.config['TRIAL_LIMIT']} students.", "danger")
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
    trial_active = school.subscription_expiry >= datetime.today().date() or student_count < current_app.config['TRIAL_LIMIT']
    
    return render_template("students.html", 
        students=students_list, 
        student_count=student_count, 
        trial_limit=current_app.config['TRIAL_LIMIT'], 
        trial_active=trial_active
    )

@app.route("/student/<int:student_id>", methods=["GET", "POST"])
@login_required
@trial_required
def student_details(student_id):
    school = current_school()
    student = db.session.get(Student, student_id)
    
    if not student or student.school_id != school.id:
        flash("Student not found or access denied.", "danger")
        return redirect(url_for("students"))
    
    # Placeholder for current context (should come from user/settings in a real app)
    current_term = request.args.get("term", "Third Term")
    current_session = request.args.get("session", "2025/2026")

    # Handle New Payment Submission
    if request.method == "POST":
        payment = create_new_payment(request.form, student)
        if payment:
            flash(f"Payment of ₦{payment.amount_paid:,.2f} recorded successfully.", "success")
        return redirect(url_for("student_details", student_id=student.id, term=current_term, session=current_session))

    # GET Request Logic
    
    # 1. Financial Summary for the selected Term/Session
    expected_fee_naira = get_expected_fee(school.id, student.student_class, current_term, current_session)
    total_paid_naira = get_total_paid_for_period(student.id, current_term, current_session)
    
    # Only show positive outstanding balance
    outstanding_naira = max(0.0, expected_fee_naira - total_paid_naira)
    
    # 2. Payments made for this specific Term/Session
    term_payments = Payment.query.filter_by(
        student_id=student.id,
        term=current_term,
        session=current_session
    ).order_by(Payment.payment_date.desc()).all()

    # 3. All distinct terms and sessions for dropdowns (for future features)
    # In a real app, you would pre-define these. Here we fetch unique ones.
    all_sessions = db.session.query(Payment.session).distinct().all()
    all_terms = db.session.query(Payment.term).distinct().all()
    
    return render_template(
        "student_details.html",
        student=student,
        current_term=current_term,
        current_session=current_session,
        expected_fee=expected_fee_naira,
        total_paid=total_paid_naira,
        outstanding=outstanding_naira,
        term_payments=term_payments,
        all_sessions=[s[0] for s in all_sessions if s[0]],
        all_terms=[t[0] for t in all_terms if t[0]]
    )

# ---------------------------
# FEE STRUCTURE MANAGEMENT
# ---------------------------
@app.route("/fee-structure", methods=["GET", "POST"])
@login_required
@trial_required
def fee_structure_management():
    school = current_school()
    
    if request.method == "POST":
        class_name = request.form.get("class_name", "").strip()
        term = request.form.get("term", "").strip()
        session_year = request.form.get("session", "").strip()
        raw_amount = request.form.get("expected_amount", "")
        
        if not all([class_name, term, session_year, raw_amount]):
            flash("All fields are required.", "danger")
            return redirect(url_for("fee_structure_management"))
            
        try:
            expected_amount_kobo, _ = _clean_and_convert_amount(raw_amount)
        except ValueError as e:
            flash(f"Invalid amount entered: {e}", "danger")
            return redirect(url_for("fee_structure_management"))

        # Check if record exists (for update)
        fee_record = FeeStructure.query.filter_by(
            school_id=school.id,
            class_name=class_name,
            term=term,
            session=session_year
        ).first()

        if fee_record:
            # Update existing record
            fee_record.expected_amount = expected_amount_kobo
            flash(f"Fee structure for {class_name} ({term} {session_year}) updated successfully.", "success")
        else:
            # Create new record
            new_fee = FeeStructure(
                school_id=school.id,
                class_name=class_name,
                term=term,
                session=session_year,
                expected_amount=expected_amount_kobo
            )
            db.session.add(new_fee)
            flash(f"Fee structure for {class_name} ({term} {session_year}) added successfully.", "success")

        db.session.commit()
        return redirect(url_for("fee_structure_management"))
        
    # GET request
    fees = FeeStructure.query.filter_by(school_id=school.id).order_by(FeeStructure.class_name, FeeStructure.session, FeeStructure.term).all()
    return render_template("fee_structure.html", fees=fees)

# ---------------------------
# API ENDPOINTS
# ---------------------------
@app.route("/search-students", methods=["GET"])
@login_required
@trial_required 
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
@trial_required 
def student_financials():
    student_id = request.args.get("student_id", type=int)
    term = request.args.get("term", "").strip()
    session_year = request.args.get("session", "").strip()
    school = current_school()
    student = db.session.get(Student, student_id)
    if not student or student.school_id != school.id:
        return jsonify(error="Student not found or access denied."), 404
    
    # 1. Get expected fee (in Naira)
    expected_amount_naira = get_expected_fee(school.id, student.student_class, term, session_year)
    
    # 2. Calculate total paid for this term/session (in Naira)
    total_paid_naira = get_total_paid_for_period(student.id, term, session_year)
    
    # 3. Calculate outstanding (in Naira)
    outstanding_naira = max(0.0, expected_amount_naira - total_paid_naira)
    
    return jsonify({
        "total_fee": expected_amount_naira, 
        "total_paid": total_paid_naira,
        "outstanding": outstanding_naira 
    })

@app.route("/student/<int:student_id>/payments", methods=["GET"])
@login_required
@trial_required
def get_student_payments(student_id):
    """API endpoint to fetch all payments for a specific student."""
    school = current_school()
    student = db.session.get(Student, student_id)
    
    if not student or student.school_id != school.id:
        app.logger.warning(f"Access denied for student ID: {student_id} or student not found.")
        return jsonify(payments=[]), 200

    payments = Payment.query.filter_by(student_id=student_id).order_by(Payment.payment_date.desc()).all()
    
    payments_data = [{
        "id": p.id,
        "amount_paid": p.amount_paid, # Already in Naira (float)
        "date": p.payment_date.isoformat(), 
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
            is_subscribed=is_subscribed,
            public_key=app.config['PAYSTACK_PUBLIC_KEY'] # Pass public key for JS initialization
        )
    
    # If the request is a POST (initiated by the user clicking the Paystack button)
    if request.method == "POST":
        # This is where you would traditionally generate a unique reference and initiate payment
        # However, for Paystack inline, the JS handles the initiation. 
        # We redirect back to the GET page to ensure the public key is loaded
        # The actual work happens in the callback.
        return redirect(url_for('pay_with_paystack_subscription'))

@app.route("/paystack-callback")
@login_required
def paystack_callback():
    school = current_school()
    reference = request.args.get("reference")
    
    if not reference:
        flash("Payment reference missing. Please try again.", "danger")
        return redirect(url_for("pay_with_paystack_subscription"))

    # Verify the transaction with Paystack API
    url = f"https://api.paystack.co/transaction/verify/{reference}"
    headers = {
        "Authorization": f"Bearer {app.config['PAYSTACK_SECRET_KEY']}"
    }

    try:
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status() # Raises an HTTPError for bad responses (4xx or 5xx)
        verification_data = response.json()
    except requests.exceptions.RequestException as e:
        app.logger.error(f"Paystack verification failed for reference {reference}: {e}")
        flash("Payment verification failed due to network error. Contact support.", "danger")
        return redirect(url_for("pay_with_paystack_subscription"))

    if verification_data.get("status") and verification_data["data"]["status"] == "success":
        # Ensure the amount matches the expected subscription amount
        paid_amount_kobo = verification_data["data"]["amount"] # Amount is in Kobo
        expected_amount_kobo = app.config['PAYSTACK_SUBSCRIPTION_AMOUNT']

        if paid_amount_kobo >= expected_amount_kobo:
            # Subscription successful! Extend the expiry date by one year (365 days)
            # Find the new start date: either today, or the day after the old expiry
            current_expiry = school.subscription_expiry
            today = datetime.today().date()
            
            if current_expiry and current_expiry > today:
                # Subscription is still active, extend from the expiry date
                new_start_date = current_expiry + timedelta(days=1)
            else:
                # Subscription expired or brand new, start from today
                new_start_date = today

            new_expiry_date = new_start_date + timedelta(days=365)
            
            school.subscription_expiry = new_expiry_date
            
            # Record the payment in the Payment table for bookkeeping
            subscription_payment = Payment(
                amount_paid=paid_amount_kobo / 100.0, # Convert kobo to Naira for storage
                payment_date=datetime.utcnow(),
                payment_type="Paystack Subscription",
                term="N/A", # Subscription payment is not tied to a term/session
                session="N/A",
                student_id=None, # Not tied to a student
                paystack_ref=reference
            )
            db.session.add(subscription_payment)
            db.session.commit()

            flash(f"Subscription renewed successfully! Expires on {new_expiry_date.strftime('%B %d, %Y')}.", "success")
            return redirect(url_for("dashboard"))
        else:
            flash(f"Payment amount of ₦{paid_amount_kobo/100:.2f} did not match the expected ₦{expected_amount_kobo/100:.2f}.", "warning")
            return redirect(url_for("pay_with_paystack_subscription"))
    else:
        # Handle failed or abandoned payments
        flash("Payment failed or was not completed. Please try again.", "danger")
        return redirect(url_for("pay_with_paystack_subscription"))


# ---------------------------
# RECEIPT GENERATION
# ---------------------------
@app.route("/receipts")
@login_required
@trial_required
def receipt_generator_index():
    school = current_school()
    # Fetch all payments for the school, joining with student data
    all_payments = (
        db.session.query(Payment, Student.name, Student.reg_number)
        .join(Student)
        .filter(Student.school_id == school.id)
        .order_by(Payment.payment_date.desc())
        .limit(50) # Limit to 50 most recent payments
        .all()
    )
    
    # Structure the data for the template
    payments_data = []
    for payment, student_name, reg_number in all_payments:
        payments_data.append({
            "id": payment.id,
            "date": payment.payment_date.strftime("%Y-%m-%d %H:%M"),
            "amount_paid": payment.amount_paid,
            "student_name": student_name,
            "reg_number": reg_number,
            "term": payment.term,
            "session": payment.session
        })
        
    return render_template("receipt_index.html", payments=payments_data)


@app.route("/generate-receipt/<int:payment_id>")
@login_required
@trial_required
def generate_receipt(payment_id):
    school = current_school()
    payment = db.session.get(Payment, payment_id)

    # Basic security check: ensure the payment belongs to the logged-in school
    if not payment or payment.student.school_id != school.id:
        flash("Receipt not found or access denied.", "danger")
        return redirect(url_for("receipt_generator_index"))

    pdf_buffer = generate_pdf_receipt(payment_id)

    if pdf_buffer:
        filename = f"Receipt_{payment_id}_{payment.student.reg_number}.pdf"
        # Send the PDF buffer as a file response
        return send_file(
            pdf_buffer,
            mimetype='application/pdf',
            as_attachment=True,
            download_name=filename
        )
    else:
        flash("Could not generate PDF receipt.", "danger")
        return redirect(url_for("receipt_generator_index"))

# Note: The original request had a placeholder for 'download_receipt'. 
# We combine the generation and download into a single, cleaner route: generate_receipt.

if __name__ == "__main__":
    with app.app_context():
        # Ensure database and tables are created before running
        db.create_all() 
    app.run(debug=True)
