# src/models.py
from datetime import datetime, timedelta
from your_app import db # Assuming your db object is imported from a central file

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
        if self.status == 'active' and self.end_date and self.end_date > datetime.utcnow():
            return True
        return False