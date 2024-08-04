import os
from pymongo import MongoClient
from pymongo.errors import ConnectionFailure, OperationFailure
import socket

# Hardcoded DATABASE_URL with the correct MongoDB URI scheme
database_url = "mongodb://light:Jayjay%23%401@76.102.168.222/myDatabase?retryWrites=true&w=majority&appName=Cluster0"

try:
    # Attempt to connect to the MongoDB server
    client = MongoClient(database_url, serverSelectionTimeoutMS=5000)
    
    # The ismaster command is cheap and does not require auth.
    client.admin.command('ismaster')
    
    print("Successfully connected to MongoDB!")
except ConnectionFailure as cf:
    print(f"Failed to connect to MongoDB. Error: {str(cf)}")
    print("Please check if the server is running and accessible.")
except OperationFailure as of:
    print(f"Authentication failed. Error: {str(of)}")
    print("Please check your credentials in the DATABASE_URL.")
except socket.error as se:
    print(f"Socket error occurred. Error: {str(se)}")
    print("This might indicate network connectivity issues or firewall restrictions.")
except Exception as e:
    print(f"An unexpected error occurred: {str(e)}")
finally:
    if 'client' in locals():
        client.close()

# Print the used DATABASE_URL for debugging (with password masked)
masked_url = database_url.replace(database_url.split(':')[2].split('@')[0], '********')
print(f"Used DATABASE_URL: {masked_url}")

# Attempt to resolve the hostname
try:
    ip = socket.gethostbyname('76.102.168.222')
    print(f"Resolved IP for the MongoDB server: {ip}")
except socket.gaierror:
    print("Failed to resolve the MongoDB server hostname.")