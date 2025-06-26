@echo off
echo Activating EdTech Platform ML Services Virtual Environment...
call venv\Scripts\activate.bat
echo.
echo Virtual environment activated!
echo You can now run:
echo   python src/api/main.py
echo   python src/utils/data_generator.py
echo.
echo To deactivate, run: deactivate
echo.
cmd /k 