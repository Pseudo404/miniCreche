from fastapi import FastAPI, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List
import database
import json

app = FastAPI(title="Sync Server - Mini Crèche")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In a WireGuard network, this is fine
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

templates = Jinja2Templates(directory="templates")

class EmargementSync(BaseModel):
    id: str
    creche_name: str
    employee_id: str
    employee_name: str
    type_event: str
    timestamp: str
    signature: str

class LoginRequest(BaseModel):
    username: str
    password: str

class EmployeeCreate(BaseModel):
    nom: str
    prenom: str
    creche_nom: str

import uuid
from fastapi import HTTPException

@app.post("/login/")
def login(req: LoginRequest, db: Session = Depends(database.get_db)):
    if req.username == "admin" and req.password == "admin":
        return {"access": "token_admin", "refresh": "none", "role": "ADMIN"}
    
    creche = db.query(database.Creche).filter(database.Creche.nom == req.username).first()
    if not creche:
        # Auto-create for simplicity in this demo, real world you'd have an admin panel
        creche = database.Creche(nom=req.username, password=req.password)
        db.add(creche)
        db.commit()
    elif creche.password != req.password:
        raise HTTPException(status_code=401, detail="Mot de passe incorrect")
        
    return {
        "access": "token_creche",
        "refresh": "none",
        "role": "CRECHE",
        "creche": {"id": str(creche.id), "nom": creche.nom}
    }

@app.get("/employees/")
def get_employees(creche: str = "", db: Session = Depends(database.get_db)):
    # Very basic employee generation if none exist for this crèche (demo purposes)
    count = db.query(database.Employee).filter(database.Employee.creche_nom == creche).count()
    if count == 0 and creche != "":
        emp1 = database.Employee(id=str(uuid.uuid4()), nom="Dupont", prenom="Marie", creche_nom=creche)
        emp2 = database.Employee(id=str(uuid.uuid4()), nom="Martin", prenom="Julie", creche_nom=creche)
        db.add_all([emp1, emp2])
        db.commit()

    employees = db.query(database.Employee).filter(database.Employee.creche_nom == creche).all()
    return [{"id": e.id, "nom": e.nom, "prenom": e.prenom} for e in employees]

@app.post("/sync")
def sync_emargements(emargements: List[EmargementSync], db: Session = Depends(database.get_db)):
    inserted_count = 0
    for e in emargements:
        # Check if already exists (idempotency)
        exists = db.query(database.Emargement).filter(database.Emargement.local_id == e.id).first()
        if not exists:
            db_record = database.Emargement(
                local_id=e.id,
                creche_name=e.creche_name,
                employee_id=e.employee_id,
                employee_name=e.employee_name,
                type_event=e.type_event,
                timestamp=e.timestamp,
                signature=e.signature
            )
            db.add(db_record)
            inserted_count += 1
    
    db.commit()
    return {"success": True, "received": len(emargements), "inserted": inserted_count}

@app.get("/", response_class=HTMLResponse)
def dashboard(request: Request, db: Session = Depends(database.get_db)):
    emargements = db.query(database.Emargement).order_by(database.Emargement.id.desc()).limit(100).all()
    stats = {
        "total": db.query(database.Emargement).count()
    }
    return templates.TemplateResponse("dashboard.html", {"request": request, "emargements": emargements, "stats": stats})
