
# 🚀 Post-Deployment Dependency Management

This guide explains how to install additional Python dependencies **after** your Docker image is deployed, without rebuilding the entire image.

## 🎯 **Why This Approach?**

- ✅ **Faster Railway builds** - Only essential dependencies in production image
- ✅ **Flexible deployment** - Add packages as needed
- ✅ **No rebuild required** - Install dependencies on running container
- ✅ **Cost-effective** - Avoid Railway timeout issues

## 📦 **Available Tools**

### 1. **Python Script** (`install_extra_deps.py`)
Cross-platform Python script for installing dependencies.

### 2. **Shell Script** (`install_deps.sh`) 
Unix/Linux shell script (also works in Docker containers).

### 3. **Requirements Files**
- `requirements.prod.txt` - Production dependencies (included in Docker build)
- `requirements.dev.txt` - Development/testing dependencies (install after deployment)

## 🚀 **How to Install Dependencies After Deployment**

### **Option 1: Using Python Script**

```bash
# Install ML dependencies (torch, transformers, etc.)
python install_extra_deps.py ml

# Install development dependencies (pytest, black, etc.)
python install_extra_deps.py dev

# Install all optional dependencies
python install_extra_deps.py all

# Install a single package
python install_extra_deps.py package torch
python install_extra_deps.py package transformers==4.30.0

# Install from requirements file
python install_extra_deps.py file requirements.dev.txt
```

### **Option 2: Using Shell Script**

```bash
# Make script executable (Linux/Mac)
chmod +x install_deps.sh

# Install ML dependencies
./install_deps.sh ml

# Install development dependencies
./install_deps.sh dev

# Install all optional dependencies
./install_deps.sh all

# Install from requirements file
./install_deps.sh file requirements.dev.txt

# Install single package
./install_deps.sh package torch
./install_deps.sh package transformers==4.30.0
```

### **Option 3: Direct pip Commands**

```bash
# Install ML packages
pip install --no-cache-dir torch transformers tokenizers scikit-learn scipy spacy sentence-transformers chromadb

# Install development packages
pip install --no-cache-dir pytest pytest-asyncio pytest-cov pytest-mock black flake8 mypy isort autoflake

# Install from requirements file
pip install --no-cache-dir -r requirements.dev.txt
```

## 🐳 **In Docker/Railway Container**

### **Access the Container:**
```bash
# If using Railway CLI
railway shell

# If using Docker directly
docker exec -it <container_name> /bin/bash

# If using Railway web terminal
# Go to Railway dashboard → Your service → Deployments → Click on deployment → Terminal
```

### **Install Dependencies:**
```bash
# Navigate to backend directory
cd /app/backend

# Run installation script
python install_extra_deps.py ml
# or
./install_deps.sh ml
```

## 📋 **What's Available to Install**

### **Machine Learning Dependencies:**
- `torch` - PyTorch deep learning framework
- `transformers` - Hugging Face transformers library
- `tokenizers` - Fast tokenizers for transformers
- `scikit-learn` - Machine learning library
- `scipy` - Scientific computing
- `spacy` - Advanced NLP
- `sentence-transformers` - Sentence embeddings
- `chromadb` - Vector database

### **Development Dependencies:**
- `pytest` - Testing framework
- `black` - Code formatter
- `flake8` - Linter
- `mypy` - Type checker
- `isort` - Import sorter
- `autoflake` - Auto-removal of unused imports

### **Additional Utilities:**
- `matplotlib` - Plotting library
- `seaborn` - Statistical data visualization
- `jupyter` - Interactive notebooks
- `ipython` - Enhanced Python shell

## ⚠️ **Important Notes**

### **Memory Considerations:**
- **ML packages are large** - `torch` alone can be 2-3GB
- **Install only what you need** - Don't install everything at once
- **Monitor container memory** - Large packages may cause memory issues

### **Persistence:**
- **Dependencies are NOT persistent** - They'll be lost if container restarts
- **For production use** - Consider adding frequently used packages to `requirements.prod.txt`
- **For development** - Reinstall after each container restart

### **Performance:**
- **First install is slow** - Large packages take time to download
- **Subsequent installs** - Use `--no-cache-dir` to avoid cache issues
- **Network dependency** - Requires internet access in container

## 🔄 **Best Practices**

### **1. Install Only What You Need:**
```bash
# Instead of installing all ML packages
python install_extra_deps.py all

# Install only what you're using
python install_extra_deps.py package torch
python install_extra_deps.py package transformers
```

### **2. Use Requirements Files for Groups:**
```bash
# Create custom requirements files for specific use cases
echo "torch>=2.0.0" > requirements.ml.txt
echo "transformers>=4.30.0" >> requirements.ml.txt
echo "scikit-learn>=1.3.0" >> requirements.ml.txt

# Install the group
python install_extra_deps.py file requirements.ml.txt
```

### **3. Monitor Resource Usage:**
```bash
# Check installed packages
pip list

# Check disk usage
du -sh /usr/local/lib/python3.11/site-packages/

# Check memory usage
free -h
```

## 🚨 **Troubleshooting**

### **Permission Errors:**
```bash
# If you get permission errors, run as root or use --user flag
pip install --user --no-cache-dir torch
```

### **Memory Issues:**
```bash
# Install packages one by one instead of all at once
pip install --no-cache-dir torch
pip install --no-cache-dir transformers
# etc.
```

### **Network Issues:**
```bash
# Use alternative package indexes if needed
pip install --no-cache-dir -i https://pypi.org/simple/ torch
```

## 📚 **Example Workflows**

### **For ML Development:**
```bash
# 1. Deploy with production image (fast build)
# 2. Access container
railway shell

# 3. Install ML dependencies
cd /app/backend
python install_extra_deps.py ml

# 4. Start development
python -c "import torch; print(torch.__version__)"
```

### **For Testing:**
```bash
# 1. Deploy with production image
# 2. Access container
railway shell

# 3. Install testing dependencies
cd /app/backend
python install_extra_deps.py dev

# 4. Run tests
pytest tests/
```

### **For Production ML Features:**
```bash
# 1. Deploy with production image
# 2. Access container
railway shell

# 3. Install only needed ML packages
cd /app/backend
pip install --no-cache-dir torch transformers

# 4. Restart your application
# (Dependencies are now available)
```

## 🎉 **Summary**

This approach gives you the **best of both worlds**:
- **Fast Railway builds** with essential dependencies only
- **Flexibility** to add packages as needed
- **No rebuilds** required for additional functionality
- **Cost-effective** deployment on Railway

Use the production requirements for your core application and install additional dependencies post-deployment when you need them!
