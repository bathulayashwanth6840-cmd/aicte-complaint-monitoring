from datetime import datetime, date
from sqlalchemy import (
    Column,
    Integer,
    String,
    Text,
    Boolean,
    DateTime,
    Date,
    ForeignKey,
    Index,
    func,
)
from sqlalchemy.orm import relationship
from app.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(150), nullable=False)
    login_identifier = Column(String(100), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(50), nullable=False, default="Bureau Officer")
    active_status = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime, default=func.now(), nullable=False)


class Institution(Base):
    __tablename__ = "institutions"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    internal_id = Column(String(50), unique=True, index=True, nullable=False)
    aicte_permanent_id = Column(String(50), unique=True, index=True, nullable=True)  # nullable until verified
    name = Column(String(255), nullable=False, index=True)
    normalized_name = Column(String(255), nullable=False, index=True)
    address = Column(Text, nullable=True)
    region = Column(String(50), nullable=False, index=True)
    state = Column(String(100), nullable=True)
    district = Column(String(100), nullable=True)
    institution_type = Column(String(100), nullable=True, default="Private-Self Financing")
    established_year = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=func.now(), nullable=False)

    # Relationships
    complaints = relationship(
        "ComplaintCase",
        back_populates="institution",
        cascade="all, delete-orphan",
    )


class ComplaintCase(Base):
    __tablename__ = "complaint_cases"

    id = Column(String(50), primary_key=True, index=True)  # e.g. "AICTE-2026-C-0841"
    institution_id = Column(Integer, ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False, index=True)
    complaint_category = Column(String(150), nullable=False, index=True)
    description = Column(Text, nullable=False)
    received_date = Column(Date, nullable=False, default=date.today, index=True)
    status = Column(String(50), nullable=False, default="Pending", index=True)
    priority = Column(String(50), nullable=False, default="Medium", index=True)
    assigned_bureau = Column(String(50), nullable=False, default="PGRC", index=True)
    assigned_officer = Column(String(150), nullable=True, index=True)
    last_action = Column(Text, nullable=True)
    next_action = Column(Text, nullable=True)
    expected_disposal_date = Column(Date, nullable=True, index=True)
    complainant_name = Column(String(150), nullable=True)
    complainant_type = Column(String(100), nullable=True, default="Student")
    complainant_contact = Column(String(150), nullable=True)
    created_at = Column(DateTime, default=func.now(), nullable=False)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    institution = relationship("Institution", back_populates="complaints")
    actions = relationship(
        "CaseAction",
        back_populates="case",
        cascade="all, delete-orphan",
        order_by="desc(CaseAction.id)",
    )
    primary_relationships = relationship(
        "CaseRelationship",
        foreign_keys="CaseRelationship.first_case_id",
        back_populates="first_case",
        cascade="all, delete-orphan",
    )
    secondary_relationships = relationship(
        "CaseRelationship",
        foreign_keys="CaseRelationship.second_case_id",
        back_populates="second_case",
        cascade="all, delete-orphan",
    )
    notifications = relationship(
        "Notification",
        back_populates="case",
        cascade="all, delete-orphan",
    )


class CaseAction(Base):
    __tablename__ = "case_actions"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    case_id = Column(String(50), ForeignKey("complaint_cases.id", ondelete="CASCADE"), nullable=False, index=True)
    acting_user = Column(String(150), nullable=False)
    action_type = Column(String(100), nullable=False, index=True)
    previous_value = Column(Text, nullable=True)
    new_value = Column(Text, nullable=True)
    remarks = Column(Text, nullable=True)
    timestamp = Column(DateTime, default=func.now(), nullable=False, index=True)

    # Relationships
    case = relationship("ComplaintCase", back_populates="actions")


class CaseRelationship(Base):
    __tablename__ = "case_relationships"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    first_case_id = Column(String(50), ForeignKey("complaint_cases.id", ondelete="CASCADE"), nullable=False, index=True)
    second_case_id = Column(String(50), ForeignKey("complaint_cases.id", ondelete="CASCADE"), nullable=False, index=True)
    relationship_type = Column(String(100), nullable=False, default="Cross-Bureau Overlap", index=True)
    matching_reason = Column(Text, nullable=False)
    review_status = Column(String(50), nullable=False, default="Pending Review", index=True)
    reviewed_by = Column(String(150), nullable=True)
    review_timestamp = Column(DateTime, nullable=True)
    review_remarks = Column(Text, nullable=True)

    # Relationships
    first_case = relationship(
        "ComplaintCase",
        foreign_keys=[first_case_id],
        back_populates="primary_relationships",
    )
    second_case = relationship(
        "ComplaintCase",
        foreign_keys=[second_case_id],
        back_populates="secondary_relationships",
    )


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    recipient = Column(String(150), nullable=False, index=True)
    related_case_id = Column(String(50), ForeignKey("complaint_cases.id", ondelete="SET NULL"), nullable=True, index=True)
    notification_type = Column(String(100), nullable=False, index=True)
    message = Column(Text, nullable=False)
    created_at = Column(DateTime, default=func.now(), nullable=False, index=True)
    read_status = Column(Boolean, nullable=False, default=False, index=True)

    # Relationships
    case = relationship("ComplaintCase", back_populates="notifications")
