from sqlalchemy import create_engine, Column, Integer, String, Text, DateTime
from sqlalchemy.orm import sessionmaker, declarative_base
from datetime import datetime

DATABASE_URL = "sqlite:///./sync_database.db"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class Creche(Base):
    __tablename__ = "creches"
    id = Column(Integer, primary_key=True, index=True)
    nom = Column(String, unique=True, index=True)
    password = Column(String) # For simple tablet login

class Employee(Base):
    __tablename__ = "employees"
    id = Column(String, primary_key=True, index=True) # UUID
    creche_nom = Column(String, index=True)
    nom = Column(String)
    prenom = Column(String)

class Emargement(Base):
    __tablename__ = "emargements"

    id = Column(Integer, primary_key=True, index=True)
    local_id = Column(String, unique=True, index=True) # UUID to prevent duplicates
    creche_name = Column(String, index=True)
    employee_id = Column(String, index=True)
    employee_name = Column(String)
    type_event = Column(String) # "ARRIVEE" or "DEPART"
    timestamp = Column(String) # ISO 8601 string
    signature = Column(Text) # Base64 PNG

Base.metadata.create_all(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
