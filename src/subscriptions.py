# src/subscriptions.py
from datetime import datetime, timedelta
from flask import Blueprint, render_template, redirect, url_for, session, flash, request
from .models import db, Subscription, School # Assuming School model exists

subscriptions = Blueprint('subscriptions', __name__)

@subscriptions.route("/pay")
def pay():
    """Renders the subscription payment page."""
    school_id = session.get('school_id')
    
    # Optional: Check for an existing pending subscription
    pending_sub = Subscription.query.filter_by(
        school_id=school_id,
        status='pending'
    ).first()

    return render_template("pay.html", school_id=school_id, pending_sub_exists=bool(pending_sub))

@subscriptions.route("/pay/toggle", methods=["POST"])
def toggle_manual_payment():
    """Manually activates the school's subscription for testing."""
    school_id = session.get('school_id')
    
    if not school_id:
        flash("You must be logged in to pay for a subscription.", "error")
        return redirect(url_for('auth.login'))

    # Find or create a new pending subscription
    subscription = Subscription.query.filter_by(
        school_id=school_id,
        status='pending'
    ).first()

    if not subscription:
        subscription = Subscription(
            school_id=school_id,
            amount=5000.00,
            status='pending'
        )
        db.session.add(subscription)
        db.session.commit()
    
    # Now, activate the subscription and set the end date (1 year from now)
    subscription.status = 'active'
    subscription.start_date = datetime.utcnow()
    subscription.end_date = datetime.utcnow() + timedelta(days=365)
    
    db.session.commit()
    
    flash("Subscription activated successfully!", "success")
    return redirect(url_for('dashboard'))