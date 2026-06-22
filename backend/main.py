import os
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from app.config import settings
from app.database import engine, get_db, Base
from app.auth import (
    register_user, authenticate_user,
    create_access_token, UserCreate, get_current_user,
    ForgotPasswordRequest, ResetPasswordRequest,
    create_password_reset_token, reset_password,
    send_reset_email,
)
from app.paypal_integration import router as payments_router
from app.resume_routes import router as resume_router
from app.template_routes import router as template_router
from app.profile_routes import router as profile_router
from app.ai_routes import router as ai_router
from app.v1_routes import router as v1_router
from app.latex_routes import router as latex_router
from app.models import User

Base.metadata.create_all(bind=engine)

app = FastAPI(title="ProfileOptimizer", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS.split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

os.makedirs(settings.UPLOAD_DIR, exist_ok=True)

@app.get("/api/health")
def health():
    return {"status": "ok", "version": "1.0.0"}

@app.post("/api/auth/register")
def register(data: UserCreate, db: Session = Depends(get_db)):
    user = register_user(data, db)
    token = create_access_token({"sub": user.id})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {"id": user.id, "email": user.email, "full_name": user.full_name},
    }

@app.post("/api/auth/login")
def login(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = authenticate_user(form.username, form.password, db)
    token = create_access_token({"sub": user.id})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {"id": user.id, "email": user.email, "full_name": user.full_name},
    }

@app.get("/api/auth/me")
def get_me(user: User = Depends(get_current_user)):
    return {"id": user.id, "email": user.email, "full_name": user.full_name}

@app.post("/api/auth/forgot-password")
def forgot_password(data: ForgotPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == data.email).first()
    if user:
        token = create_password_reset_token(user, db)
        send_reset_email(user.email, token)
    return {"message": "If that email is registered, a reset link has been sent."}

@app.post("/api/auth/reset-password")
def reset_password_endpoint(data: ResetPasswordRequest, db: Session = Depends(get_db)):
    user = reset_password(data.token, data.new_password, db)
    return {"message": "Password reset successfully"}

app.include_router(payments_router)
app.include_router(resume_router)
app.include_router(template_router)
app.include_router(profile_router)
app.include_router(ai_router)
app.include_router(v1_router)
app.include_router(latex_router)
