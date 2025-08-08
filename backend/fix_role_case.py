#!/usr/bin/env python3
"""
Fix Role Case Migration Script
Converts any uppercase role values in the database to lowercase
"""

import sys
import os
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from database import get_database_url
from db_models import User

def fix_role_case():
    """Fix any uppercase role values in the database"""
    
    # Get database URL
    database_url = get_database_url()
    engine = create_engine(database_url)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    
    db = SessionLocal()
    
    try:
        print("Checking for users with uppercase role values...")
        
        # Find users with uppercase roles
        users_with_uppercase_roles = db.query(User).filter(
            User.role.in_(['CLIENT', 'ADMIN'])
        ).all()
        
        if not users_with_uppercase_roles:
            print("✅ No users found with uppercase role values.")
            return
        
        print(f"Found {len(users_with_uppercase_roles)} users with uppercase role values:")
        
        for user in users_with_uppercase_roles:
            old_role = user.role
            new_role = user.role.lower()
            print(f"  - User {user.email}: {old_role} → {new_role}")
            user.role = new_role
        
        # Commit the changes
        db.commit()
        print(f"✅ Successfully updated {len(users_with_uppercase_roles)} user roles to lowercase.")
        
    except Exception as e:
        print(f"❌ Error fixing role case: {e}")
        db.rollback()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    print("🔧 Starting role case fix migration...")
    fix_role_case()
    print("✅ Role case fix migration completed!")
