#!/usr/bin/env python3
"""
NLTK Data Downloader
Automatically downloads required NLTK data packages for the AI Optimization Engine
"""

import nltk
import os
import sys
from pathlib import Path

def download_nltk_data():
    """Download all required NLTK data packages"""
    print("🔄 Checking and downloading required NLTK data...")
    
    # List of required NLTK data packages
    required_packages = [
        'punkt_tab',           # For tokenization (new version)
        'punkt',               # For tokenization (classic version)
        'stopwords',           # For stop word filtering
        'averaged_perceptron_tagger',  # For POS tagging (old version)
        'averaged_perceptron_tagger_eng',  # For POS tagging (new version)
        'wordnet',             # For lemmatization
        'omw-1.4',             # Open Multilingual Wordnet
        'vader_lexicon',       # For sentiment analysis
        'brown',               # Brown corpus
        'reuters',             # Reuters corpus
        'movie_reviews'        # Movie reviews corpus
    ]
    
    downloaded_packages = []
    failed_packages = []
    
    for package in required_packages:
        try:
            print(f"📦 Downloading NLTK package: {package}")
            # Force download even if it exists, to ensure it's properly installed
            result = nltk.download(package, quiet=False, force=False)
            if result:
                downloaded_packages.append(package)
                print(f"✅ Successfully downloaded: {package}")
            else:
                print(f"⚠️  Download returned False for: {package}")
                failed_packages.append(package)
            
        except Exception as e:
            print(f"❌ Failed to download {package}: {e}")
            failed_packages.append(package)
            # Continue with other packages even if one fails
            continue
    
    # Summary
    print(f"\n📊 NLTK Data Download Summary:")
    print(f"✅ Successfully downloaded: {len(downloaded_packages)} packages")
    if downloaded_packages:
        for pkg in downloaded_packages:
            print(f"   - {pkg}")
    
    if failed_packages:
        print(f"❌ Failed to download: {len(failed_packages)} packages")
        for pkg in failed_packages:
            print(f"   - {pkg}")
        print("⚠️  Some NLTK features may not work properly")
    else:
        print("🎉 All NLTK data packages downloaded successfully!")
    
    return len(failed_packages) == 0

def ensure_nltk_data():
    """Ensure NLTK data is available, download if missing"""
    # Check all critical packages, not just one
    critical_packages = [
        ('tokenizers/punkt_tab', 'punkt_tab'),
        ('taggers/averaged_perceptron_tagger_eng', 'averaged_perceptron_tagger_eng'),
        ('corpora/stopwords', 'stopwords'),
        ('corpora/wordnet', 'wordnet')
    ]
    
    missing_packages = []
    
    for resource_path, package_name in critical_packages:
        try:
            nltk.data.find(resource_path)
            print(f"✅ Found: {package_name}")
        except LookupError:
            missing_packages.append(package_name)
            print(f"❌ Missing: {package_name}")
    
    if not missing_packages:
        print("🎉 All critical NLTK data packages are available!")
        return True
    else:
        print(f"🔍 Missing {len(missing_packages)} packages, downloading all NLTK data...")
        return download_nltk_data()

if __name__ == "__main__":
    """Run this script directly to download NLTK data"""
    print("🚀 Starting NLTK data download...")
    success = download_nltk_data()
    
    if success:
        print("🎉 NLTK setup completed successfully!")
        sys.exit(0)
    else:
        print("⚠️  NLTK setup completed with some warnings")
        sys.exit(1)