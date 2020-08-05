#!/bin/bash

pip install -r requirements.txt
python train.py --img 640 --batch 16 --epochs 50 --data ./train/dataset.yml --cfg ./train/yolov5x.yml --resume
