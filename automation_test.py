import sys
import time

def main():
    print("[SYSTEM]: Python environment is working correctly.")
    print(f"[INFO]: Python version: {sys.version}")
    print("[INFO]: Starting dummy process...")
    for i in range(1, 6):
        print(f"[STDOUT]: Processing step {i}/5...")
        time.sleep(1)
    print("[SYSTEM]: Test completed successfully.")

if __name__ == "__main__":
    main()
