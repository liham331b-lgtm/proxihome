import os

os.environ["DISABLE_SQLALCHEMY_CYEXTENSIONS"] = "1"
os.environ["SQLALCHEMY_NO_CYEXTENSIONS"] = "1"

from app import create_app

app = create_app()

if __name__ == "__main__":
    app.run(debug=True, port=5000)