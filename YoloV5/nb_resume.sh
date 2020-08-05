#!/bin/bash

pip install -r requirements.txt
rm ../Temp/data_yolo/images/*.cache
python train.py --img 960 --batch 16 --epochs 25 --data ./train/dataset.yml --cfg ./train/yolov5x.yml --resume
