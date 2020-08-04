# DataConverter

This module is for converting existing ModelArts Dataset to a csv format introduced in the EfficientDet implementation. 

The original XML labeling format is:
```xml
<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<annotation>
    <folder>NA</folder>
    <filename>4771.jpg</filename>
    <source>
        <database>Unknown</database>
    </source>
    <size>
        <width>1280</width>
        <height>720</height>
        <depth>3</depth>
    </size>
    <segmented>0</segmented>
    <object>
        <name>pedestrian_crossing</name>
        <pose>Unspecified</pose>
        <truncated>0</truncated>
        <difficult>0</difficult>
        <occluded>0</occluded>
        <bndbox>
            <xmin>26</xmin>
            <ymin>623</ymin>
            <xmax>609</xmax>
            <ymax>707</ymax>
        </bndbox>
    </object>
    <object>
        <name>speed_unlimited</name>
        <pose>Unspecified</pose>
        <truncated>0</truncated>
        <difficult>0</difficult>
        <occluded>0</occluded>
        <bndbox>
            <xmin>178</xmin>
            <ymin>400</ymin>
            <xmax>235</xmax>
            <ymax>476</ymax>
        </bndbox>
    </object>
    <object>
        <name>speed_limited</name>
        <pose>Unspecified</pose>
        <truncated>0</truncated>
        <difficult>0</difficult>
        <occluded>0</occluded>
        <bndbox>
            <xmin>580</xmin>
            <ymin>420</ymin>
            <xmax>641</xmax>
            <ymax>500</ymax>
        </bndbox>
    </object>
</annotation>
```
The converted csv format is:
label:
```csv
path/to/image.jpg,x1,y1,x2,y2,class_name
```
defination:
```csv
class_name,id
```
