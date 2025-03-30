#!/bin/bash

# Run all tests and continue even if some fail
echo "Running all tests..."
pytest tests/test_integration.py -v || true

echo "Tests completed. Starting the API server..."
python app.py 