#!/bin/bash
cd /Users/fangchao/WorkBuddy/2026-06-23-10-36-46/edu_mvp/backend
/Users/fangchao/.workbuddy/binaries/python/envs/edu-mvp/bin/uvicorn main:app --host 0.0.0.0 --port 8000 --reload
