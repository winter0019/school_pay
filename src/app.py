from flask import Flask, render_template, request, redirect, url_for, session, send_file, flash, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from io import BytesIO
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
import os
from datetime import datetime, timedelta
from sqlalchemy import UniqueConstraint, func
from sqlalchemy.orm import joinedload
from functools import wraps
from .subscriptions import subscriptions # Import the subscription blueprint

# ---------------------------
# APP INITIALIZATION
# ---------------------------
app = Flask(__name__)

# ---------------------------
# DATABASE CONFIG
# ---------------------------
db_url = os.environ.get("DATABASE_URL", "sqlite:///alfurqan.db")

# Convert Render's postgres:// -> postgresql+pg8000://
if db_url.startswith("postgres://"):
    db_url = db_url.replace("postgres://", "postgresql+pg8000://", 1)
elif db_url.startswith("postgresql://"):
    db_url = db_url.replace("postgresql://", "postgresql+pg8000://", 1)

app.config['SQLALCHEMY_DATABASE_URI'] = db_url
app.config['SECRET_KEY'] = 'supersecret'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# ---------------------------
# DB + MIGRATIONS
# ---------------------------
db = SQLAlchemy(app)
migrate = Migrate(app, db)

# Register Blueprints
app.register_blueprint(subscriptions, url_prefix='/subscriptions')

# ---------------------------
# MODELS (Updated for Multi-Tenancy)
# ---------------------------

class School(db.Model):
    # Minimal School model to support the foreign key relationships
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(150), nullable=False)
    # Add other school details as needed

class Subscription(db.Model):
    __tablename__ = 'subscription'
    id = db.Column(db.Integer, primary_key=True)
    school_id = db.Column(db.Integer, db.ForeignKey('school.id'), nullable=False)
    amount = db.Column(db.Numeric(10, 2), default=5000.00)
    status = db.Column(db.String(20), default="pending")  # 'pending', 'active', 'expired'
    start_date = db.Column(db.DateTime, default=datetime.utcnow)
    end_date = db.Column(db.DateTime)

    school = db.relationship("School", backref="subscriptions")

    @property
    def is_active(self):
        """Check if the subscription is currently active."""
        # Check if status is active AND end date is in the future
        if self.status == 'active' and self.end_date and self.end_date > datetime.utcnow():
            return True
        return False

class Student(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    school_id = db.Column(db.Integer, db.ForeignKey('school.id'), nullable=False) # Multi-tenant Key
    name = db.Column(db.String(150), nullable=False)
    reg_number = db.Column(db.String(50), nullable=False)
    student_class = db.Column(db.String(50), nullable=False)
    
    school = db.relationship("School", backref="students")
    payments = db.relationship("Payment", backref="student", lazy="select")
    
    __table_args__ = (UniqueConstraint('school_id', 'reg_number', name='_school_reg_uc'),)

class Payment(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    amount_paid = db.Column(db.Float, nullable=False)
    payment_date = db.Column(db.Date, nullable=False)
    payment_type = db.Column(db.String(100))
    term = db.Column(db.String(20))
    session = db.Column(db.String(20))
    student_id = db.Column(db.Integer, db.ForeignKey("student.id"), nullable=False)

class Fee(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    school_id = db.Column(db.Integer, db.ForeignKey('school.id'), nullable=False) # Multi-tenant Key
    student_class = db.Column(db.String(50), nullable=False)
    term = db.Column(db.String(20), nullable=False)
    session = db.Column(db.String(20), nullable=False)
    amount = db.Column(db.Float, nullable=False)
    
    school = db.relationship("School", backref="fees")

    __table_args__ = (UniqueConstraint('school_id', 'student_class', 'term', 'session', name='_school_class_term_session_uc'),)


# ---------------------------
# MIDDLEWARE & AUTH (Updated for Multi-Tenancy/Subscription)
# ---------------------------
ADMIN_USER = "admin"
ADMIN_PASS = "password" # 🔴 Change this in production!

def check_admin(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        # We check for both 'admin' and 'school_id' now
        if not session.get("admin") or not session.get("school_id"):
            flash("Please log in to access this page.", "warning")
            return redirect(url_for("index"))
        return f(*args, **kwargs)
    return decorated_function


@app.before_request
def check_subscription():
    # List of endpoints that should NOT be checked for subscription
    # Note: 'index' is the login/register page
    exempt_endpoints = ['index', 'logout', 'subscriptions.pay', 'static']

    # Get the current endpoint name from the request
    endpoint = request.endpoint
    
    # Check if the current endpoint is in the list of exempt endpoints
    if endpoint in exempt_endpoints or not endpoint:
        return

    # Check if a school ID is in the session and if admin is logged in
    school_id = session.get('school_id')
    is_admin = session.get('admin')
    
    if not school_id or not is_admin:
        # If not logged in, allow them to hit routes that redirect to login
        # (check_admin decorator handles the actual redirect if they try to access a protected route)
        return

    # Look up the school's active subscription
    subscription = Subscription.query.filter_by(
        school_id=school_id,
    ).order_by(Subscription.end_date.desc()).first()

    # If no active subscription is found, redirect to the payment page
    if not subscription or not subscription.is_active:
        return redirect(url_for('subscriptions.pay'))


@app.route("/", methods=["GET", "POST"])
def index():
    if request.method == "POST":
        username = request.form.get("username")
        password = request.form.get("password")
        
        if username == ADMIN_USER and password == ADMIN_PASS:
            # Placeholder: In a real app, this would find the School admin is tied to
            school = School.query.first()
            if not school:
                 # Create a default school for initial testing if none exists
                school = School(name="Test School 1")
                db.session.add(school)
                db.session.commit()
            
            session["admin"] = True
            session["school_id"] = school.id # Set the school ID in session for multi-tenancy
            flash(f"Logged in as {school.name} Admin.", "success")
            return redirect(url_for("dashboard"))
            
        flash("Invalid credentials", "error")
        
    return render_template("index.html")


@app.route("/dashboard")
@check_admin
def dashboard():
    school_id = session.get('school_id')
    
    # Check subscription status for the banner (middleware already protected access)
    subscription = Subscription.query.filter_by(school_id=school_id).order_by(Subscription.end_date.desc()).first()
    subscription_active = subscription.is_active if subscription else False

    # Multi-tenant queries: filter everything by the school_id
    total_students = Student.query.filter_by(school_id=school_id).count()
    
    # Total payments: join on student table to ensure payments belong to this school's students
    total_payments = db.session.query(db.func.sum(Payment.amount_paid)).join(Student).filter(
        Student.school_id == school_id
    ).scalar() or 0
    
    outstanding_balance = 0 # Complex calculation, left as 0 for now
    
    recent_payments = Payment.query.join(Student).filter(
        Student.school_id == school_id
    ).order_by(Payment.payment_date.desc()).limit(5).all()

    return render_template(
        'dashboard.html',
        total_students=total_students,
        total_payments=total_payments,
        outstanding_balance=outstanding_balance,
        recent_payments=recent_payments,
        subscription_active=subscription_active # Passed to control the banner
    )


@app.route("/logout")
def logout():
    session.pop("admin", None)
    session.pop("school_id", None)
    flash("You have been logged out.", "info")
    return redirect(url_for("index"))

# ---------------------------
# STUDENTS & PAYMENTS (Updated for Multi-Tenancy)
# ---------------------------
@app.route("/students")
@check_admin
def students_list():
    """Lists all students belonging to the current school."""
    school_id = session.get('school_id')
    students = Student.query.filter_by(school_id=school_id).all()
    return render_template("students_list.html", students=students)


@app.route("/add-student", methods=["GET", "POST"])
@check_admin
def add_student():
    """Adds a new student, associating them with the current school."""
    school_id = session.get('school_id')
    if request.method == "POST":
        name = request.form["name"]
        reg_number = request.form["reg_number"]
        student_class = request.form["student_class"]

        try:
            student = Student(
                name=name, 
                reg_number=reg_number, 
                student_class=student_class,
                school_id=school_id # Multi-tenant key
            )
            db.session.add(student)
            db.session.commit()
            flash("Student added successfully!", "success")
            return redirect(url_for("students_list"))
        except Exception as e:
            db.session.rollback()
            flash(f"Error adding student: Registration number already exists in this school.", "error")
            
    return render_template("add_student.html")


@app.route("/student/<int:student_id>/payments")
@check_admin
def student_payments(student_id):
    """Displays a student's payment history with per-term financial summaries."""
    school_id = session.get('school_id')
    
    # Multi-tenant check: Get student and ensure they belong to the current school
    student = Student.query.filter_by(id=student_id, school_id=school_id).first_or_404()
    payments = Payment.query.filter_by(student_id=student_id).all() # No need to filter by school_id here as student_id is already scoped

    # Group payments by a unique term-session key
    financial_summaries = {}
    for p in payments:
        key = (p.term, p.session)
        if key not in financial_summaries:
            financial_summaries[key] = {
                'term': p.term,
                'session': p.session,
                'total_paid': 0,
                'total_fees': 0,  # Placeholder, will be looked up
                'payments': [],
            }
        financial_summaries[key]['total_paid'] += p.amount_paid
        financial_summaries[key]['payments'].append(p)

    # For each term-session group, look up the fee and calculate outstanding balance
    for key, summary in financial_summaries.items():
        fee_record = Fee.query.filter_by(
            school_id=school_id, # Must filter fee by school_id
            student_class=student.student_class,
            term=summary['term'],
            session=summary['session']
        ).first()
        summary['total_fees'] = fee_record.amount if fee_record else 0
        summary['outstanding_balance'] = summary['total_fees'] - summary['total_paid']

    # Sort summaries by session and term for consistent display
    sorted_summaries = sorted(
        financial_summaries.values(),
        key=lambda x: (x['session'], x['term'])
    )

    return render_template(
        "student_payments.html",
        student=student,
        payments=payments,
        sorted_summaries=sorted_summaries
    )


@app.route("/add-payment", methods=["GET", "POST"])
@check_admin
def add_payment():
    """Handles the form to add a new payment, ensuring student belongs to the school."""
    school_id = session.get('school_id')

    if request.method == "POST":
        student_id = request.form.get("student_id")
        
        # Multi-tenant check: Get student and ensure they belong to the current school
        student = Student.query.filter_by(id=student_id, school_id=school_id).first()
        if not student:
            flash("Invalid student or permission denied.", "error")
            return redirect(url_for("add_payment"))
            
        amount_paid_str = request.form.get("amount_paid")
        payment_type = request.form.get("payment_type")
        term = request.form.get("term")
        session_year = request.form.get("session")

        if not student_id or not amount_paid_str:
            flash("Missing student or payment amount.", "error")
            return redirect(url_for("add_payment"))
            
        try:
            amount_paid = float(amount_paid_str)
        except ValueError:
            flash("Invalid amount. Please enter a valid number.", "error")
            return redirect(url_for("add_payment"))

        payment = Payment(
            amount_paid=amount_paid,
            payment_date=datetime.today().date(),
            payment_type=payment_type,
            term=term,
            session=session_year,
            student_id=student.id # Use validated student ID
        )
        db.session.add(payment)
        db.session.commit()
        
        flash("Payment recorded successfully! Generating receipt...", "success")
        return redirect(url_for("view_receipt", payment_id=payment.id))

    return render_template("add_payment.html")


@app.route("/search-students")
@check_admin
def search_students():
    """API endpoint for searching students, scoped to the current school."""
    school_id = session.get('school_id')
    query = request.args.get("q", "")
    results = []
    if query:
        results = Student.query.filter(
            Student.school_id == school_id, # Multi-tenant filter
            (Student.name.ilike(f"%{query}%")) |
            (Student.reg_number.ilike(f"%{query}%"))
        ).all()
    return {
        "students": [
            {"id": s.id, "name": s.name, "reg_number": s.reg_number, "student_class": s.student_class}
            for s in results
        ]
    }


@app.route("/student-financials")
@check_admin
def student_financials():
    """API endpoint to get a student's financial summary, scoped to the current school."""
    school_id = session.get('school_id')
    student_id = request.args.get("student_id")
    term = request.args.get("term")
    session_year = request.args.get("session")

    if not all([student_id, term, session_year]):
        return jsonify({"error": "Missing parameters"}), 400

    # Multi-tenant check
    student = Student.query.filter_by(id=student_id, school_id=school_id).first()
    if not student:
        return jsonify({"error": "Student not found or permission denied"}), 404

    # Multi-tenant fee lookup
    fee_record = Fee.query.filter_by(
        school_id=school_id,
        student_class=student.student_class,
        term=term,
        session=session_year
    ).first()
    total_fee = fee_record.amount if fee_record else 0

    payments = Payment.query.filter_by(
        student_id=student.id,
        term=term,
        session=session_year
    ).order_by(Payment.payment_date).all()

    total_paid = sum(p.amount_paid for p in payments)
    outstanding = total_fee - total_paid

    return jsonify({
        "student": {
            "id": student.id,
            "name": student.name,
            "reg_number": student.reg_number,
            "class": student.student_class,
        },
        "term": term,
        "session": session_year,
        "total_fee": total_fee,
        "total_paid": total_paid,
        "outstanding": outstanding,
        "payments": [
            {
                "id": p.id,
                "amount_paid": p.amount_paid,
                "payment_type": p.payment_type,
                "payment_date": p.payment_date.strftime("%Y-%m-%d"),
            } for p in payments
        ]
    })

# ---------------------------
# FEE MANAGEMENT (Updated for Multi-Tenancy)
# ---------------------------
@app.route("/manage-fees", methods=["GET", "POST"])
@check_admin
def manage_fees():
    school_id = session.get('school_id')
    
    if request.method == "POST":
        student_class = request.form.get("student_class")
        term = request.form.get("term")
        session_year = request.form.get("session")
        amount = request.form.get("amount")
        
        if not all([student_class, term, session_year, amount]):
            flash("All fields are required.", "error")
            return redirect(url_for("manage_fees"))
            
        try:
            fee_amount = float(amount)
            # Find existing fee scoped to the current school
            existing_fee = Fee.query.filter_by(
                school_id=school_id, # Multi-tenant filter
                student_class=student_class,
                term=term,
                session=session_year
            ).first()
            
            if existing_fee:
                existing_fee.amount = fee_amount
                flash("Fee updated successfully!", "success")
            else:
                new_fee = Fee(
                    school_id=school_id, # Multi-tenant key
                    student_class=student_class,
                    term=term,
                    session=session_year,
                    amount=fee_amount
                )
                db.session.add(new_fee)
                flash("Fee added successfully!", "success")
                
            db.session.commit()
            
        except ValueError:
            flash("Invalid amount. Please enter a valid number.", "error")
            return redirect(url_for("manage_fees"))
            
    # Fetch fees scoped to the current school
    fees = Fee.query.filter_by(school_id=school_id).all()
    return render_template("manage_fees.html", fees=fees)

# ---------------------------
# RECEIPT GENERATOR (Updated for Multi-Tenancy)
# ---------------------------
@app.route("/receipt-generator", methods=["GET", "POST"])
@check_admin
def receipt_generator():
    """Generates a receipt for a specific payment, searches students scoped to the current school."""
    school_id = session.get('school_id')
    search_results = []
    if request.method == "POST":
        query = request.form.get("search_query")
        if query:
            search_results = Student.query.filter(
                Student.school_id == school_id, # Multi-tenant filter
                (Student.name.ilike(f"%{query}%")) |
                (Student.reg_number.ilike(f"%{query}%"))
            ).options(joinedload(Student.payments)).all()
    
    return render_template("receipt_generator.html", search_results=search_results)


@app.route("/view-receipt/<int:payment_id>")
@check_admin
def view_receipt(payment_id):
    """
    Renders and serves a PDF receipt for a payment, ensuring payment belongs to the school.
    """
    school_id = session.get('school_id')
    
    # Eagerly load the student for the tenancy check
    payment = Payment.query.options(joinedload(Payment.student)).get_or_404(payment_id)
    student = payment.student
    
    # Multi-tenancy check: Ensure the student belongs to the current school
    if student.school_id != school_id:
        flash("You do not have permission to view this receipt.", "error")
        return redirect(url_for('dashboard'))
        
    # Get the total fees for the student's class, term, and session (scoped to school)
    fee_record = Fee.query.filter_by(
        school_id=school_id, # Filter fee by school_id
        student_class=student.student_class,
        term=payment.term,
        session=payment.session
    ).first()
    total_fees = fee_record.amount if fee_record else 0

    # Get the total amount paid by the student for the specific term/session
    total_paid_for_term = db.session.query(db.func.sum(Payment.amount_paid)).filter(
        Payment.student_id == student.id,
        Payment.term == payment.term,
        Payment.session == payment.session
    ).scalar() or 0
    
    remaining_balance = total_fees - total_paid_for_term

    # Create PDF
    buffer = BytesIO()
    p = canvas.Canvas(buffer, pagesize=A4)
    width, height = A4

    # Add logo
    # Note: Assumes alfurqan_logo.jpg is accessible in the root directory
    if os.path.exists("alfurqan_logo.jpg"):
        p.drawImage("alfurqan_logo.jpg", 50, height - 120, width=80, height=60)

    # Add header text
    p.setFont("Helvetica-Bold", 16)
    p.drawString(200, height - 50, "ALFURQAN ACADEMY")
    p.setFont("Helvetica", 10)
    p.drawString(200, height - 65, "Mai’adua | Motto: Academic Excellence")
    p.drawString(200, height - 80, "Tel: 07067702084, 08025076989")

    # Add receipt title
    p.setFont("Helvetica-Bold", 14)
    p.drawString(230, height - 140, "PAYMENT RECEIPT")

    # Add student details
    y = height - 180
    p.setFont("Helvetica", 12)
    p.drawString(50, y, f"School: {student.school.name}") # Display school name
    p.drawString(50, y - 20, f"Student Name: {student.name}")
    p.drawString(50, y - 40, f"Reg Number: {student.reg_number}")
    p.drawString(50, y - 60, f"Class: {student.student_class}")

    # Add payment details
    p.drawString(50, y - 100, f"Date: {payment.payment_date.strftime('%Y-%m-%d')}")
    p.drawString(50, y - 120, f"Term: {payment.term}")
    p.drawString(50, y - 140, f"Session: {payment.session}")
    p.drawString(50, y - 160, f"Payment Type: {payment.payment_type}")
    p.drawString(50, y - 180, f"Receipt No: {payment.id}")
    
    # Add financial summary
    y_summary = y - 220
    p.setFont("Helvetica-Bold", 12)
    p.drawString(50, y_summary, "Financial Summary")
    p.setFont("Helvetica", 12)
    p.drawString(50, y_summary - 20, f"Amount Paid: ₦{payment.amount_paid:,.2f}")
    p.setFont("Helvetica-Bold", 12)
    p.setFillColorRGB(0.8, 0, 0)
    p.drawString(50, y_summary - 40, f"Remaining Balance: ₦{remaining_balance:,.2f}")
    p.setFillColorRGB(0, 0, 0)

    # Add footer
    p.setFont("Helvetica-Oblique", 10)
    p.drawString(200, 80, "Thank you for your payment!")

    p.setFont("Helvetica", 12)
    p.drawString(50, 120, "______________________")
    p.drawString(50, 105, "Admin")
    p.drawString(350, 120, "______________________")
    p.drawString(350, 105, "Bursar")

    p.showPage()
    p.save()
    buffer.seek(0)

    return send_file(
        buffer,
        mimetype="application/pdf",
        download_name=f"receipt_{payment.id}.pdf"
    )

# ---------------------------
# ENTRY POINT
# ---------------------------
if __name__ == "__main__":
    with app.app_context():
        db.create_all()
    app.run(host="0.0.0.0", port=5000, debug=True)
