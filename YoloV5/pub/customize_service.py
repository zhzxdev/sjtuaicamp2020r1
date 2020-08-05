# -*- coding: utf-8 -*-
from collections import OrderedDict

import torch.backends.cudnn as cudnn

import models
import utils

from model_service.tfserving_model_service import TfServingBaseService
import torch
import time
import log
import numpy as np
import os

logger = log.getLogger(__name__)


class ObjectDetectionService(TfServingBaseService):
    def __init__(self, model_name, model_path):
        self.obj_list = ['red_stop', 'green_go', 'yellow_back', 'pedestrian_crossing', 'speed_limited', 'speed_unlimited']
        self.input_image_key = 'images'
        self.weights = './best.pt'
        self.model_path = os.path.join(os.path.dirname(__file__), self.weights)
        print("init completed")
        # make sure these files exist
        # self.compound_coef = 0
        # force_input_size = None  # set None to use default size
        # # img_path = 'test/img.png'

        # # replace this part with your project's anchor config
        # self.anchor_ratios = [(1.0, 1.0), (1.4, 0.7), (0.7, 1.4)]
        # self.anchor_scales = [2 ** 0, 2 ** (1.0 / 3.0), 2 ** (2.0 / 3.0)]

        # self.threshold = 0.2
        # self.iou_threshold = 0.2

        # self.use_cuda = True
        # self.use_float16 = False
        # self.input_image_key = 'images'
        # self.label_map = parse_classify_rule(os.path.join(os.path.dirname(__file__), 'classify_rule.json'))

    def _preprocess(self, data):
        preprocessed_data = {}
        print(data)
        for k, v in data.items():
            for file_name, file_content in v.items():
                # img = Image.open(file_content)
                # img = self.transforms(img)
                print(file_name)
                print(file_content)
                preprocessed_data[k] = file_content
        return preprocessed_data

    def _inference(self, data):
        imgsz = 960
        device = 'cpu'
        conf_thres = 0.4
        iou_thres = 0.01
        # print(data)
        img = data[self.input_image_key]
        # print(img)
        self.ori_imgs = data[self.input_image_key]

        # Initialize
        device = utils.torch_utils.select_device(device)
        half = device.type != 'cpu'  # half precision only supported on CUDA

        # Load model
        model = models.experimental.attempt_load(self.model_path, map_location=device)  # load FP32 model
        imgsz = utils.general.check_img_size(imgsz, s=model.stride.max())  # check img_size
        if half:
            model.half()  # to FP16

        dataset = utils.datasets.LoadImages(img, img_size=imgsz)

        # Get names and colors
        names = model.module.names if hasattr(model, 'module') else model.names
        # colors = [[random.randint(0, 255) for _ in range(3)] for _ in range(len(names))]

        # Run inference
        img = torch.zeros((1, 3, imgsz, imgsz), device=device)  # init img
        _ = model(img.half() if half else img) if device.type != 'cpu' else None  # run once
        result = []
        for path, img, im0s, vid_cap in dataset:
            img = torch.from_numpy(img).to(device)
            img = img.half() if half else img.float()  # uint8 to fp16/32
            img /= 255.0  # 0 - 255 to 0.0 - 1.0
            if img.ndimension() == 3:
                img = img.unsqueeze(0)

            # Inference
            pred = model(img, augment=False)[0]

            # Apply NMS
            pred = utils.general.non_max_suppression(pred, conf_thres, iou_thres, classes=None, agnostic=False)

            # Process detections
            for i, det in enumerate(pred):  # detections per image
                p, s, im0 = path, '', im0s

                s += '%gx%g ' % img.shape[2:]  # print string
                # gn = torch.tensor(im0.shape)[[1, 0, 1, 0]]  # normalization gain whwh
                if det is not None and len(det):
                    # Rescale boxes from img_size to im0 size
                    det[:, :4] = utils.general.scale_coords(img.shape[2:], det[:, :4], im0.shape).round()

                    # Print results
                    for c in det[:, -1].unique():
                        n = (det[:, -1] == c).sum()  # detections per class
                        s += '%g %ss, ' % (n, names[int(c)])  # add to string

                    for i in range(det.size()[0]):

                        xmin = (det[i][0].item())
                        ymin = (det[i][1].item())
                        xmax = (det[i][2].item())
                        ymax = (det[i][3].item())
                        conf = (det[i][4].item())
                        cls = int(det[i][5].item())

                        result.append([xmin, ymin, xmax, ymax, conf, cls])
        return result

    def _postprocess(self, data):
        result = OrderedDict()

        if len(data) == 0:
            result['detection_classes'] = []
            result['detection_scores'] = []
            result['detection_boxes'] = []

        out_classes = []
        out_scores = []
        out_boxes = []
        for j in range(len(data)):
            # x1, y1, x2, y2 = data[j][:4].astype(np.int)
            obj = self.obj_list[data[j][5]]
            score = float(data[j][4])
            out_boxes.append([int(data[j][1]), int(data[j][0]), int(data[j][3]), int(data[j][2])])
            out_scores.append(score)
            out_classes.append(obj)

        # detection_class_names = []
        # for class_id in out_classes:
        #     class_name = self.obj_list[int(class_id)]
        #     class_name = self.label_map[class_name] + '/' + class_name
        #     detection_class_names.append(class_name)
        out_boxes_list = []
        for box in out_boxes:
            out_boxes_list.append([round(float(v), 1) for v in box])

        result['detection_classes'] = out_classes
        result['detection_scores'] = out_scores
        result['detection_boxes'] = out_boxes_list
        return result

    def inference(self, data):
        '''
        Wrapper function to run preprocess, inference and postprocess functions.

        Parameters
        ----------
        data : map of object
            Raw input from request.

        Returns
        -------
        list of outputs to be sent back to client.
            data to be sent back
        '''
        pre_start_time = time.time()
        data = self._preprocess(data)
        infer_start_time = time.time()
        # Update preprocess latency metric
        pre_time_in_ms = (infer_start_time - pre_start_time) * 1000
        logger.info('preprocess time: ' + str(pre_time_in_ms) + 'ms')

        # if self.model_name + '_LatencyPreprocess' in MetricsManager.metrics:
        #     MetricsManager.metrics[self.model_name + '_LatencyPreprocess'].update(pre_time_in_ms)

        data = self._inference(data)
        infer_end_time = time.time()
        infer_in_ms = (infer_end_time - infer_start_time) * 1000

        logger.info('infer time: ' + str(infer_in_ms) + 'ms')
        data = self._postprocess(data)

        # Update inference latency metric
        post_time_in_ms = (time.time() - infer_end_time) * 1000
        logger.info('postprocess time: ' + str(post_time_in_ms) + 'ms')
        # if self.model_name + '_LatencyInference' in MetricsManager.metrics:
        #     MetricsManager.metrics[self.model_name + '_LatencyInference'].update(post_time_in_ms)

        # Update overall latency metric
        # if self.model_name + '_LatencyOverall' in MetricsManager.metrics:
        #     MetricsManager.metrics[self.model_name + '_LatencyOverall'].update(pre_time_in_ms + post_time_in_ms)

        logger.info('latency: ' + str(pre_time_in_ms + infer_in_ms + post_time_in_ms) + 'ms')
        data['latency_time'] = str(round(pre_time_in_ms + infer_in_ms + post_time_in_ms, 1)) + ' ms'
        return data


# def parse_classify_rule(json_path=''):
#     with codecs.open(json_path, 'r', 'utf-8') as f:
#         rule = json.load(f)
#     label_map = {}
#     for super_label, labels in rule.items():
#         for label in labels:
#             label_map[label] = super_label
#     return label_map

if __name__ == "__main__":
    pass