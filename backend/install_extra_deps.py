#!/usr/bin/env python3
"""
Script to install additional Python dependencies after deployment.
This allows you to add dependencies without rebuilding the Docker image.
"""

import subprocess
import sys
import os
from pathlib import Path

def install_package(package_name, version=None):
    """Install a single package with optional version specification."""
    try:
        if version:
            package_spec = f"{package_name}=={version}"
        else:
            package_spec = package_name
            
        print(f"Installing {package_spec}...")
        result = subprocess.run([
            sys.executable, "-m", "pip", "install", 
            "--no-cache-dir", package_spec
        ], capture_output=True, text=True)
        
        if result.returncode == 0:
            print(f"✅ Successfully installed {package_spec}")
            return True
        else:
            print(f"❌ Failed to install {package_spec}")
            print(f"Error: {result.stderr}")
            return False
            
    except Exception as e:
        print(f"❌ Error installing {package_name}: {e}")
        return False

def install_from_file(file_path):
    """Install packages from a requirements file."""
    if not os.path.exists(file_path):
        print(f"❌ Requirements file not found: {file_path}")
        return False
        
    print(f"Installing packages from {file_path}...")
    try:
        result = subprocess.run([
            sys.executable, "-m", "pip", "install", 
            "--no-cache-dir", "-r", file_path
        ], capture_output=True, text=True)
        
        if result.returncode == 0:
            print(f"✅ Successfully installed packages from {file_path}")
            return True
        else:
            print(f"❌ Failed to install packages from {file_path}")
            print(f"Error: {result.stderr}")
            return False
            
    except Exception as e:
        print(f"❌ Error installing from {file_path}: {e}")
        return False

def install_ml_dependencies():
    """Install common ML dependencies that were removed for production."""
    ml_packages = [
        "torch",
        "transformers",
        "tokenizers", 
        "scikit-learn",
        "scipy",
        "spacy",
        "sentence-transformers",
        "chromadb"
    ]
    
    print("🚀 Installing ML dependencies...")
    success_count = 0
    
    for package in ml_packages:
        if install_package(package):
            success_count += 1
    
    print(f"\n📊 ML dependencies installation complete: {success_count}/{len(ml_packages)} successful")
    return success_count == len(ml_packages)

def install_dev_dependencies():
    """Install development and testing dependencies."""
    dev_packages = [
        "pytest",
        "pytest-asyncio", 
        "pytest-cov",
        "pytest-mock",
        "black",
        "flake8",
        "mypy",
        "isort",
        "autoflake"
    ]
    
    print("🔧 Installing development dependencies...")
    success_count = 0
    
    for package in dev_packages:
        if install_package(package):
            success_count += 1
    
    print(f"\n📊 Dev dependencies installation complete: {success_count}/{len(dev_packages)} successful")
    return success_count == len(dev_packages)

def main():
    """Main function to handle command line arguments."""
    if len(sys.argv) < 2:
        print("""
🚀 Post-Deployment Dependency Installer

Usage:
  python install_extra_deps.py [command] [options]

Commands:
  package <package_name> [version]  - Install a single package
  file <requirements_file>          - Install from requirements file
  ml                                - Install ML dependencies (torch, transformers, etc.)
  dev                               - Install development dependencies
  all                               - Install all optional dependencies

Examples:
  python install_extra_deps.py package torch
  python install_extra_deps.py package transformers==4.30.0
  python install_extra_deps.py file requirements.dev.txt
  python install_extra_deps.py ml
  python install_extra_deps.py dev
  python install_extra_deps.py all
        """)
        return
    
    command = sys.argv[1].lower()
    
    if command == "package":
        if len(sys.argv) < 3:
            print("❌ Please specify a package name")
            return
        package_name = sys.argv[2]
        version = sys.argv[3] if len(sys.argv) > 3 else None
        install_package(package_name, version)
        
    elif command == "file":
        if len(sys.argv) < 3:
            print("❌ Please specify a requirements file path")
            return
        file_path = sys.argv[2]
        install_from_file(file_path)
        
    elif command == "ml":
        install_ml_dependencies()
        
    elif command == "dev":
        install_dev_dependencies()
        
    elif command == "all":
        print("🚀 Installing all optional dependencies...")
        install_ml_dependencies()
        print("\n" + "="*50 + "\n")
        install_dev_dependencies()
        
    else:
        print(f"❌ Unknown command: {command}")
        print("Use 'python install_extra_deps.py' for help")

if __name__ == "__main__":
    main()
