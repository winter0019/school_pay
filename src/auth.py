from flask import Blueprint, render_template, request, redirect, url_for, session, flash
from .app import db, School # Assuming db and School model are available

auth = Blueprint('auth', __name__)

@auth.route("/", methods=["GET", "POST"])
def index():
    """Handles the School Admin Login."""
    if session.get("school_id") and session.get("admin"):
        # If already logged in, redirect to dashboard
        return redirect(url_for('dashboard'))

    if request.method == "POST":
        email = request.form.get("email")
        password = request.form.get("password")
        
        school = School.query.filter_by(admin_email=email).first()
        
        if school and school.check_password(password):
            session["admin"] = True
            session["school_id"] = school.id
            flash(f"Welcome back, {school.name} Admin!", "success")
            return redirect(url_for("dashboard"))
        
        flash("Invalid email or password.", "error")
        
    return render_template("index.html")

@auth.route("/register", methods=["GET", "POST"])
def register():
    """Handles new School Admin Registration."""
    if request.method == "POST":
        school_name = request.form.get("school_name")
        email = request.form.get("email")
        password = request.form.get("password")
        
        if not (school_name and email and password):
            flash("All fields are required.", "error")
            return redirect(url_for('auth.register'))

        if School.query.filter_by(admin_email=email).first():
            flash("An account with that email already exists.", "error")
            return redirect(url_for('auth.register'))

        try:
            # 1. Create the new school
            new_school = School(name=school_name, admin_email=email)
            new_school.set_password(password)
            db.session.add(new_school)
            db.session.commit()
            
            # 2. Automatically log the new admin in
            session["admin"] = True
            session["school_id"] = new_school.id
            
            # 3. Create a pending subscription entry (forces payment check)
            pending_sub = Subscription(
                school_id=new_school.id,
                status='pending',
                amount=5000.00
            )
            db.session.add(pending_sub)
            db.session.commit()
            
            flash(f"School {school_name} registered successfully! Please pay the subscription fee to unlock your dashboard.", "success")
            # Redirect them immediately to the payment page due to pending subscription
            return redirect(url_for('subscriptions.pay'))

        except Exception as e:
            db.session.rollback()
            flash(f"An error occurred during registration: {e}", "error")
            
    return render_template("register.html")

@auth.route("/logout")
def logout():
    session.pop("admin", None)
    session.pop("school_id", None)
    flash("You have been logged out.", "info")
    # Redirect to the auth.index route (which is now the login page)
    return redirect(url_for('auth.index'))
