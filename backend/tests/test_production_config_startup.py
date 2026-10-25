"""
Automated pytest verifying application startup under production environment:
Executes tests/verify_production_startup.py in a clean, isolated sub-process
to test authentic production configuration without memory pollution from other test suites.
"""

import sys
import subprocess
from pathlib import Path

def test_production_mode_isolated_startup():
    test_script = Path(__file__).resolve().parent / "verify_production_startup.py"
    backend_dir = Path(__file__).resolve().parent.parent
    
    result = subprocess.run(
        [sys.executable, str(test_script)],
        cwd=str(backend_dir),
        capture_output=True,
        text=True
    )
    
    # Assert successful process exit
    assert result.returncode == 0, f"Production startup verification failed!\nStdout: {result.stdout}\nStderr: {result.stderr}"
    assert "PRODUCTION STARTUP CONFIGURATION VERIFIED SUCCESSFULLY!" in result.stdout
    assert "[OK] Verified clean database schema without demo injection: 0 institutions, 0 cases." in result.stdout
