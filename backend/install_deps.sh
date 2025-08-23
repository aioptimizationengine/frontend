#!/bin/bash

# Post-Deployment Dependency Installer Script
# This script allows you to install additional dependencies after deployment

set -e

echo "🚀 Post-Deployment Dependency Installer"
echo "========================================"

# Function to install ML dependencies
install_ml() {
    echo "Installing Machine Learning dependencies..."
    pip install --no-cache-dir torch transformers tokenizers scikit-learn scipy spacy sentence-transformers chromadb
    echo "✅ ML dependencies installed successfully!"
}

# Function to install development dependencies
install_dev() {
    echo "Installing Development dependencies..."
    pip install --no-cache-dir pytest pytest-asyncio pytest-cov pytest-mock black flake8 mypy isort autoflake
    echo "✅ Development dependencies installed successfully!"
}

# Function to install all optional dependencies
install_all() {
    echo "Installing all optional dependencies..."
    install_ml
    echo ""
    install_dev
    echo ""
    echo "Installing additional utilities..."
    pip install --no-cache-dir matplotlib seaborn plotly jupyter ipython notebook
    echo "✅ All optional dependencies installed successfully!"
}

# Function to install from requirements file
install_from_file() {
    if [ -z "$1" ]; then
        echo "❌ Please specify a requirements file path"
        echo "Usage: ./install_deps.sh file <requirements_file>"
        exit 1
    fi
    
    if [ ! -f "$1" ]; then
        echo "❌ Requirements file not found: $1"
        exit 1
    fi
    
    echo "Installing packages from $1..."
    pip install --no-cache-dir -r "$1"
    echo "✅ Packages from $1 installed successfully!"
}

# Function to install a single package
install_package() {
    if [ -z "$1" ]; then
        echo "❌ Please specify a package name"
        echo "Usage: ./install_deps.sh package <package_name> [version]"
        exit 1
    fi
    
    if [ -z "$2" ]; then
        echo "Installing $1..."
        pip install --no-cache-dir "$1"
    else
        echo "Installing $1==$2..."
        pip install --no-cache-dir "$1==$2"
    fi
    
    echo "✅ Package $1 installed successfully!"
}

# Function to show help
show_help() {
    echo "
🚀 Post-Deployment Dependency Installer

Usage:
  ./install_deps.sh [command] [options]

Commands:
  ml                                - Install ML dependencies (torch, transformers, etc.)
  dev                               - Install development dependencies
  all                               - Install all optional dependencies
  file <requirements_file>          - Install from requirements file
  package <package_name> [version]  - Install a single package
  help                              - Show this help message

Examples:
  ./install_deps.sh ml
  ./install_deps.sh dev
  ./install_deps.sh all
  ./install_deps.sh file requirements.dev.txt
  ./install_deps.sh package torch
  ./install_deps.sh package transformers==4.30.0

Note: This script installs dependencies in the current Python environment.
Make sure you're running it in the correct container/environment.
"
}

# Main script logic
case "${1:-help}" in
    "ml")
        install_ml
        ;;
    "dev")
        install_dev
        ;;
    "all")
        install_all
        ;;
    "file")
        install_from_file "$2"
        ;;
    "package")
        install_package "$2" "$3"
        ;;
    "help"|*)
        show_help
        ;;
esac
