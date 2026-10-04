from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class VisitCreate(BaseModel):
    visitor_key: str = Field(min_length=16, max_length=64, pattern=r"^[a-zA-Z0-9-]+$")


class ReviewCreate(BaseModel):
    reviewer_name: str = Field(min_length=1, max_length=120)
    rating: int = Field(ge=1, le=5)
    review: str = Field(min_length=5, max_length=2000)


class ReviewRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    reviewer_name: str
    rating: int
    review: str
    created_at: datetime


class WebsiteStats(BaseModel):
    today_visitors: int
    today_signups: int
    total_customers: int
    today_reviews: int
