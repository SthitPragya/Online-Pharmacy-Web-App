from flask import Flask, request, render_template
import sqlite3

import face_recognition
import cv2
import numpy as np
import os
import glob
import time
import hashlib
from PIL import Image

import json

conn=sqlite3.connect('hwipersonal.db', check_same_thread=False)
print("DB opened successfully")
"""
conn.execute('''CREATE TABLE User
         (emailid char(40) PRIMARY KEY     NOT NULL,
         NAME           TEXT    NOT NULL,
         AGE            INT     NOT NULL,
         password       char(15) not null);''')

conn.execute('''CREATE TABLE USERPRESCRIPTION (
             pid INTEGER  PRIMARY KEY AUTOINCREMENT NOT NULL,
             eid char(40) not null,
            FOREIGN KEY(eid) REFERENCES User(emailid) ON DELETE CASCADE);''')

conn.execute('''CREATE TABLE MEDICINE(
        MID INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
        NAME TEXT NOT NULL,
        AUTHENTICATION CHAR(1) NOT NULL);''')

conn.execute('''CREATE TABLE PRESCRIPTION(
        mid integer not null,
        pid integer not null,
        FOREIGN KEY(MID) REFERENCES MEDICINE(MID) ON DELETE CASCADE,
        FOREIGN KEY(PID) REFERENCES USERPRESCRIPTION(PID) ON DELETE CASCADE);''')
"""

app = Flask(__name__, template_folder="templates")

@app.route("/")
def home():
    return "TEAM 10 HWI"

@app.route("/getalltable", methods=['GET'])
def getall():
    res={}
    res['user']=[]
    res['prescription']=[]
    res['userprescription']=[]
    res['medicine']=[]
    rows=conn.execute('select * from user;')
    for i in rows:
        res['user'].append(list(i))
    rows=conn.execute('select * from userprescription;')
    for i in rows:
        res['userprescription'].append(list(i))
    rows=conn.execute('select * from prescription;')
    for i in rows:
        res['prescription'].append(list(i))
    rows=conn.execute('select * from medicine;')
    for i in rows:
        res['medicine'].append(list(i))
    res=json.dumps(res)
    return(res)


@app.route('/upload_medicine/', methods = ['POST'])
def upload_medicine():
    #print(request.form)
    s=request.json
    name=s['name']
    auth=s['auth']
    val="'"+name+"','"+auth+"'"
    conn.execute("INSERT INTO medicine(name, authentication) VALUES ( "+val+" );")
    res=conn.execute("Select * from medicine;")
    arr=""
    for i in res:
        arr=arr+str(i)
    conn.commit()
    print(arr)
    return("Success")

@app.route("/delmedicine/", methods=['POST'])
def delmedicine():
    s=request.json
    mid=s['mid']
    conn.execute("Delete from medicine where mid="+mid+";")
    return("Success")

#@app.route("/parse/")
@app.route('/registration/', methods = ['POST'])
def registration():
    #print(request.form)
    s=request.json
    email=s['email']
    name=s['name']
    password=s['password']
    age=s['age']
    cursor = conn.execute("SELECT emailid from user")
    for ids in cursor:
        if(ids[0]==email):
            return("User already present")
    val="'"+email+"','"+name+"',"+age+",'"+password+"'"
    conn.execute("INSERT INTO user (emailid, NAME, AGE, password) VALUES ( "+val+" )");
    conn.commit()
    return("Yes")


@app.route('/get_user/', methods = ['GET'])
def get_user():
    #print(request.form)
    meds = conn.execute("Select * from user;")
    d={}
    d['eid']=[]
    d['name']=[]
    d['age']=[]
    d['password']=[]
    for i in meds:
        d['eid'].append(i[0])
        d['name'].append(i[1])
        d['age'].append(i[2])
        d['password'].append(i[3])
    d=json.dumps(d)
    return d

@app.route("/deluser/", methods=['POST'])
def deluser():
    s=request.json
    eid=s['eid']
    conn.execute("Delete from user where emailid='"+eid+"';")
    return("Success")

@app.route('/login/', methods = ['POST'])
def login():
    #print(request.form)
    s=request.json
    #s=request.form
    #print(s)
    email=s['email']
    password=s['password']
    cursor = conn.execute("SELECT * from user;")
    js={}
    for ids in cursor:
        if(ids[0]==email):
            if(ids[3]==password):
                js['email']=ids[0]
                js['name']=ids[1]
                js['age']=ids[2]
                js=json.dumps(js)
                return(js)
            else:
                return "Incorrect Password"
    return("User not present. Please Register.")

@app.route('/upload_prescription/', methods = ['POST'])
def upload_prescription():
    #print(request.form)
    s=request.json
    mid=s['mid']
    email=s['email']
    val="'"+email+"'"
    cursor = conn.execute("INSERT INTO userprescription (eid) VALUES ( "+val+" );")
    pid=conn.execute("Select max(pid) from userprescription;")
    print(pid)
    for i in pid:
        pid=list(i)
        break
    for i in mid:
        val=str(pid[0])+","+i
        conn.execute("INSERT INTO prescription (pid, mid) VALUES ( "+val+" );")
    conn.commit()
    return "Success"


@app.route('/get_all_prescription/', methods = ['GET'])
def get_all_prescription():
    #print(request.form)
    meds = conn.execute("Select * from prescription;")
    d={}
    d['pid']=[]
    d['mid']=[]
    for i in meds:
        d['mid'].append(i[0])
        d['pid'].append(i[1])
    d=json.dumps(d)
    return d

@app.route('/get_prescription/', methods = ['GET'])
def get_prescription():
    s=request.args
    email=s['email']
    pid=[]
    res = conn.execute("Select pid from userprescription where eid='"+email+"';")
    for i in res:
        pid.append(i)
    dic={}
    print(pid)
    for p in pid:
        res=p[0]
        mid=conn.execute("Select mid from prescription where pid="+str(res)+";")
        meds=[]
        for i in mid:
            val=i[0]
            rest=conn.execute("Select * from medicine where mid="+str(val)+";")
            for j in rest:
                meds.append(list(j))
        dic[res]=meds
    dic=json.dumps(dic)
    return dic

@app.route("/removeprescription/", methods=['POST'])
def removeprescription():
    s=request.json
    pid=s['pid']
    conn.execute("Delete from userprescription where pid="+pid+";")
    return("Success")

@app.route('/get_medicine/', methods = ['GET'])
def get_medicine():
    #print(request.form)
    meds = conn.execute("Select * from medicine;")
    #print(meds)
    d={}
    d['mid']=[]
    d['name']=[]
    d['auth']=[]
    for i in meds:
        print(str(i))
        d['mid'].append(i[0])
        d['name'].append(i[1])
        d['auth'].append(i[2])
    d=json.dumps(d)
    return d

@app.route('/order/', methods=['POST'])
def order():
    s=request.json
    email=s['email']
    pid=s['pid']
    mid=conn.execute("Select mid from prescription where pid="+str(pid)+";")
    meds=[]
    for i in mid:
        val=i[0]
        rest=conn.execute("Select * from medicine where mid="+str(val)+";")
        for j in rest:
            meds.append(list(j))
    for j in meds:
        if(j[2]=='Y'):
            return("Required")
    return("Order Successful")


@app.route('/getphoto/', methods=['POST'])
def getphoto():
    s=request.form
    photo=request.files['file']
    photoname=photo.filename
    print(photoname)

@app.route('/validatephoto/', methods=['POST'])
def validate():
    s=request.json
    email=s['email']
    known_image = face_recognition.load_image_file("photos/"+email+".jpg")
    unknown_image = face_recognition.load_image_file("validatephotos/"+email+".jpg")

    biden_encoding = face_recognition.face_encodings(known_image)[0]
    unknown_encoding = face_recognition.face_encodings(unknown_image)[0]

    results = face_recognition.face_distance([biden_encoding], unknown_encoding)
    print(results)
    if(results<0.4):
        return("Yes")
    else:
        return ("No")


@app.route('/camera/', methods=['GET', 'POST', 'DELETE'])
def cam():
    return render_template("index.html")
    
if __name__ == "__main__":
    app.run(host='0.0.0.0', port=80, debug=True)
