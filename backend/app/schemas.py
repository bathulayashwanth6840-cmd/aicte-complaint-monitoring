from datetime import date, datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, ConfigDict, field_validator


# ==========================================
# USER SCHEMAS
# ==========================================

class UserBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=150)
    login_identifier: str = Field(..., min_length=3, max_length=100)
    role: str = Field(default="Bureau Officer")
    active_status: bool = True


class UserCreate(UserBase):
    password: str = Field(..., min_length=6)


class UserResponse(UserBase):
    id: int
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class UserLoginRequest(BaseModel):
    login_identifier: str = Field(..., min_length=3)
    password: str = Field(..., min_length=1)


# ==========================================
# INSTITUTION SCHEMAS
# ==========================================

class InstitutionBase(BaseModel):
    name: str = Field(..., min_length=3, max_length=255)
    aicte_permanent_id: Optional[str] = Field(None, max_length=50)
    internal_id: Optional[str] = Field(None, max_length=50)
    address: Optional[str] = None
    region: str = Field(..., min_length=2, max_length=50)
    state: Optional[str] = None
    district: Optional[str] = None
    institution_type: Optional[str] = "Private-Self Financing"
    established_year: Optional[int] = None


class InstitutionCreate(InstitutionBase):
    pass


class InstitutionUpdate(BaseModel):
    name: Optional[str] = None
    aicte_permanent_id: Optional[str] = None
    address: Optional[str] = None
    region: Optional[str] = None
    state: Optional[str] = None
    district: Optional[str] = None
    institution_type: Optional[str] = None
    established_year: Optional[int] = None


class InstitutionResponse(InstitutionBase):
    id: int
    internal_id: str
    normalized_name: str
    created_at: datetime
    total_cases: int = 0
    open_cases: int = 0
    model_config = ConfigDict(from_attributes=True)


# ==========================================
# CASE ACTION & AUDIT SCHEMAS
# ==========================================

class CaseActionCreate(BaseModel):
    acting_user: str = Field(..., min_length=2, max_length=150)
    action_type: str = Field(..., min_length=2, max_length=100)
    previous_value: Optional[str] = None
    new_value: Optional[str] = None
    remarks: Optional[str] = None


class CaseActionResponse(BaseModel):
    id: int
    case_id: str
    acting_user: str
    action_type: str
    previous_value: Optional[str]
    new_value: Optional[str]
    remarks: Optional[str]
    timestamp: datetime
    model_config = ConfigDict(from_attributes=True)


# ==========================================
# CASE RELATIONSHIP / OVERLAP SCHEMAS
# ==========================================

class CaseRelationshipCreate(BaseModel):
    first_case_id: str
    second_case_id: str
    relationship_type: str = "Cross-Bureau Overlap"
    matching_reason: str = Field(..., min_length=5)


class CaseRelationshipReviewUpdate(BaseModel):
    review_status: str = Field(..., min_length=2)  # "Joint Hearing Constituted", "Dismissed", "Merged"
    reviewed_by: str = Field(..., min_length=2)
    review_remarks: Optional[str] = None


class CaseRelationshipResponse(BaseModel):
    id: int
    first_case_id: str
    second_case_id: str
    relationship_type: str
    matching_reason: str
    review_status: str
    reviewed_by: Optional[str]
    review_timestamp: Optional[datetime]
    review_remarks: Optional[str]
    model_config = ConfigDict(from_attributes=True)


# ==========================================
# COMPLAINT CASE SCHEMAS
# ==========================================

class ComplaintCaseBase(BaseModel):
    institution_id: int
    complaint_category: str = Field(..., min_length=3, max_length=150)
    description: str = Field(..., min_length=10)
    received_date: Optional[date] = None
    priority: str = Field(default="Medium")
    assigned_bureau: str = Field(default="PGRC")
    assigned_officer: Optional[str] = None
    next_action: Optional[str] = None
    expected_disposal_date: Optional[date] = None
    complainant_name: Optional[str] = None
    complainant_type: Optional[str] = "Student"
    complainant_contact: Optional[str] = None


class ComplaintCaseCreate(ComplaintCaseBase):
    acting_user: Optional[str] = "Intake Officer"
    custom_case_id: Optional[str] = None


class ComplaintCaseUpdate(BaseModel):
    complaint_category: Optional[str] = None
    description: Optional[str] = None
    priority: Optional[str] = None
    assigned_bureau: Optional[str] = None
    assigned_officer: Optional[str] = None
    status: Optional[str] = None
    last_action: Optional[str] = None
    next_action: Optional[str] = None
    expected_disposal_date: Optional[date] = None
    acting_user: Optional[str] = "Authorized Officer"
    remarks: Optional[str] = None


class CaseAssignmentUpdate(BaseModel):
    assigned_bureau: str = Field(..., min_length=2)
    assigned_officer: str = Field(..., min_length=2)
    remarks: Optional[str] = None
    acting_user: str = Field(default="Central Administrator")


class CaseStatusUpdate(BaseModel):
    status: str = Field(..., min_length=2)
    remarks: Optional[str] = None
    acting_user: str = Field(default="Authorized Officer")


class CaseTransferRequest(BaseModel):
    transfer_to: str = Field(..., min_length=2)
    reason: str = Field(..., min_length=5)
    acting_user: str = Field(default="Authorized Officer")


class CaseEscalationRequest(BaseModel):
    escalate_to: str = Field(..., min_length=2)
    reason: str = Field(..., min_length=5)
    acting_user: str = Field(default="Authorized Officer")


class ComplaintCaseResponse(BaseModel):
    id: str
    institution_id: int
    institution_name: Optional[str] = None
    institution_pid: Optional[str] = None
    region: Optional[str] = None
    complaint_category: str
    description: str
    received_date: date
    status: str
    priority: str
    assigned_bureau: str
    assigned_officer: Optional[str]
    last_action: Optional[str]
    next_action: Optional[str]
    expected_disposal_date: Optional[date]
    complainant_name: Optional[str]
    complainant_type: Optional[str]
    complainant_contact: Optional[str]
    created_at: datetime
    updated_at: datetime
    days_pending: int = 0
    is_overdue: bool = False
    has_overlap: bool = False
    actions: List[CaseActionResponse] = []
    model_config = ConfigDict(from_attributes=True)


class InstitutionWithCasesResponse(InstitutionResponse):
    complaints: List[ComplaintCaseResponse] = []


# ==========================================
# NOTIFICATION SCHEMAS
# ==========================================

class NotificationCreate(BaseModel):
    recipient: str = Field(..., min_length=2)
    related_case_id: Optional[str] = None
    notification_type: str = Field(..., min_length=2)
    message: str = Field(..., min_length=5)


class NotificationResponse(BaseModel):
    id: int
    recipient: str
    related_case_id: Optional[str]
    notification_type: str
    message: str
    created_at: datetime
    read_status: bool
    model_config = ConfigDict(from_attributes=True)


# ==========================================
# DASHBOARD & REPORTS SCHEMAS
# ==========================================

class DashboardStatsResponse(BaseModel):
    total_cases: int
    pending_cases: int
    under_process_cases: int
    disposed_cases: int
    transferred_cases: int
    overdue_cases: int
    unresolved_overlaps: int
    total_institutions: int
    resolution_rate: float


class BureauWorkloadItem(BaseModel):
    bureau_id: str
    code: str
    name: str
    active_cases: int
    disposed_cases: int
    overdue_cases: int
    total: int


class RegionDistributionItem(BaseModel):
    region: str
    total_cases: int
    overdue_cases: int


class StatusDistributionItem(BaseModel):
    name: str
    value: int
    color: str
