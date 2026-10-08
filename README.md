# 🍃 AirDose

> **What is AirDose?**  
> AirDose is **not** a generic AQI monitor. AirDose is a **personal air-pollution exposure tracker** that estimates how much pollution a person is exposed to throughout the day. It combines the user's location, movement, time, activity, and local PM2.5 levels to calculate pollution exposure across different places such as home, college, work, and travel.

---

## 🎯 Complete Beginner's Guide: Clone to Contribution

This guide covers **every single step and command** you need to clone the repository, run the project locally on your computer, make changes, and push them to GitHub.

---

### Step 1: Clone the Repository to Your Laptop

Open your terminal (PowerShell / Command Prompt on Windows, or Terminal on macOS/Linux) and run:

```bash
git clone https://github.com/anujkantx/AirDose.git
cd AirDose
```

---

### Step 2: Set Up & Run the Backend (Python FastAPI)

Open a **new terminal window** inside the `AirDose` folder:

1. **Go to the backend directory:**
   ```bash
   cd backend
   ```

2. **Create a virtual environment:**
   - **Windows:**
     ```bash
     python -m venv .venv
     .venv\Scripts\activate
     ```
   - **macOS / Linux:**
     ```bash
     python3 -m venv .venv
     source .venv/bin/activate
     ```

3. **Install the required packages:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Set up the environment variables:**
   - Copy the example environment file:
     ```bash
     # Windows (PowerShell)
     Copy-Item .env.example .env

     # macOS / Linux
     cp .env.example .env
     ```
   - Open `.env` in any text editor and put your OpenAQ API Key (free from [openaq.org](https://openaq.org)):
     ```env
     OPENAQ_API_KEY=your_actual_api_key_here
     PORT=8000
     HOST=0.0.0.0
     ```

5. **Start the backend server:**
   ```bash
   uvicorn app.main:app --reload --port 8000
   ```
   ✅ Backend is running at: `http://localhost:8000`  
   ✅ API Documentation is at: `http://localhost:8000/docs`

---

### Step 3: Set Up & Run the Frontend (Next.js)

Open a **second terminal window** inside the `AirDose` folder:

1. **Go to the frontend directory:**
   ```bash
   cd frontend
   ```

2. **Install Node dependencies:**
   ```bash
   npm install
   ```

3. **Set up the frontend environment file:**
   ```bash
   # Windows (PowerShell)
   Copy-Item .env.example .env.local

   # macOS / Linux
   cp .env.example .env.local
   ```

4. **Start the frontend development server:**
   ```bash
   npm run dev
   ```
   ✅ Open your browser and go to: `http://localhost:3000`

---

### Step 4: Make Your Changes (Development Workflow)

1. **Create a new Git branch for your feature or fix:**
   ```bash
   git checkout -b my-new-feature
   ```

2. Open the project in your code editor (e.g., VS Code):
   ```bash
   code .
   ```

3. Edit the code, save your changes, and check the live browser updates on `http://localhost:3000`.

---

### Step 5: Test & Verify Your Changes

Before committing, make sure the project builds without errors:

```bash
cd frontend
npm run build
```

If it builds successfully, you are ready to push!

---

### Step 6: Commit and Push Your Changes to GitHub

1. **Check which files you changed:**
   ```bash
   git status
   ```

2. **Stage your modified files:**
   ```bash
   git add .
   ```

3. **Commit your changes with a descriptive message:**
   ```bash
   git commit -m "Explain what changes you made"
   ```

4. **Push your branch to GitHub:**
   ```bash
   git push -u origin my-new-feature
   ```

5. **Create a Pull Request (PR):**
   - Go to [https://github.com/anujkantx/AirDose](https://github.com/anujkantx/AirDose)
   - You will see a banner saying **"Compare & pull request"**. Click it.
   - Write a short description of what you improved and click **"Create pull request"**.

---

### Step 7: How to Stop / Exit the Development Servers

When you are done working:
- In each terminal window running `uvicorn` or `npm run dev`, press **`Ctrl + C`**.
- To deactivate the Python virtual environment in the backend terminal, simply type:
  ```bash
  deactivate
  ```

---

## 📄 License
This project is open-source and available under the [MIT License](LICENSE).
