var express=require('express');
var app=express();
var session = require('express-session');
var cookieParser = require('cookie-parser');
const axios = require('axios');
const FormData = require('form-data');

var multer  = require('multer');


app.set('view engine', 'pug');
app.set('views', './views');
app.use(session({secret: "Shh, its a secret!"}));
app.use(cookieParser());

var bodyparser=require('body-parser');
app.use(bodyparser.urlencoded(
    {extended:false})
);

var ngrokurl="http://ccaae3a5dba6.ngrok.io";
var sess='';

var storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, './../photos')
    },
    filename: function (req, file, cb) {
        cb(null, sess.user+".jpg")
  }
});

var upload = multer({ storage: storage });

app.get('/photocapture', function(req, res){
    if(sess.user)
        res.render('photocapture');
    else
        res.redirect('/logout');
});

app.post('/photocapture', upload.single('photo'),function(req, res) {
    res.redirect('/logout');
    //res.send("File upload sucessfully.");
    //res.redirect('/logout');
});


var storagecheck = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, './../validatephotos')
    },
    filename: function (req, file, cb) {
        cb(null, sess.user+".jpg")
  }
});

var uploadcheck = multer({ storage: storagecheck });


app.get('/photocheck', function(req, res){
    if(sess.user)
        res.render('photocheck', {name:sess.name});
    else
        res.redirect('/logout');
});

app.post('/photocheck', uploadcheck.single('photo'),function(req, res) {
    if(sess.user){
    axios.post(ngrokurl+'/validatephoto/', {
        email: sess.user
      })
      .then((response) => {
        data=response.data;
        console.log(data);
        var valid=data;
        if(valid=="Yes")
            res.render('orderstatus', {name:sess.name, message:"Order Successful"});
        else
            res.render('orderstatus', {name:sess.name, message:"Authentication Failed"});
        //res.send(valid);
      }, (error) => {
        console.log(error);
      });
    }
    else
        res.redirect("/index");
});

app.get('/index', function(req, res){
    res.render('homepage', {
        message:'Hello World',
        friends:0,
        count:5,
        title:"sample"
    });
});

app.get('/login', function(req, res){
    res.render('login', {
        //data:JSON.stringify(req.query)
    })
});

app.post('/login', function(req, res){
    var id=req.body.username;
    var pwd=req.body.password;
    axios.post(ngrokurl+'/login/', {
        email: id,
        password: pwd
      })
      .then((response) => {
        //console.log(response);
        data=response.data;
        if(data=="Incorrect Password")
            res.render('login', {message:"Invalid Password"});
        else if(data=="User not present. Please Register.")
            res.render('login', {message: data});
        else{
            console.log(data);
            //var json=JSON.parse(data);
            //console.log(json);
            sess=req.session;
            sess.user=id;
            sess.name=data['name'];
            sess.age=data['age'];
            res.redirect('/page');
        }
      }, (error) => {
        console.log(error);
      });
});

app.get('/page', function(req, res){
    if(sess.user){
        var subnames=[];
        var subid=[];
        axios.get(ngrokurl+'/get_prescription/', {
            params:{
        email: sess.user}
      })
      .then((response) => {
        data=response.data;
        console.log(data);
        var arr=Object.keys(data);
        for(var i=0;i<arr.length;i++){
            subid.push(arr[i]);
            var temp=[]
            var d=0;
            for(var j=0;j<data[arr[i]].length;j++)
                temp.push(data[arr[i]][j][1])
            subnames.push(temp);
        }
        res.render('page',{
            fid:sess.user,
            fname:sess.name,
            cid:subid,
            coursename:subnames
        });
      }, (error) => {
        console.log(error);
      });
    }
    else
        res.redirect('/index');
});

app.get('/addprescription', function(req, res){
    if(sess.user){
        axios.get(ngrokurl+'/get_medicine/', {})
      .then((response) => {
        data=response.data;
        console.log(data);
        var arr=data['mid'];
        var name=data['name'];
        var auth=data['auth'];
        res.render('addprescription', {
            nm:sess.name,
            reg:sess.user,
            coursesid:arr,
            sname:name,
            sub:auth
        });
      }, (error) => {
        console.log(error);
      });
    }
    else
        res.redirect('/index');
});

app.post('/adduserprescription', function(req, res){
    if(sess.user){
        var mids=req.body.mid;
        axios.post(ngrokurl+'/upload_prescription/', {
            email: sess.user,
            mid: mids
          })
      .then((response) => {
        data=response.data;
        console.log(data);
        res.redirect('/page');
      }, (error) => {
        console.log(error);
      });
    }
    else
        res.redirect('/index');
});

app.get('/removeprescription/:pid', function(req, res){
    if(sess.user){
        console.log(req.params);
        var pid=req.params.pid;
        axios.post(ngrokurl+'/removeprescription/', {
            pid: pid
          })
      .then((response) => {
        data=response.data;
        console.log(data);
      }, (error) => {
        console.log(error);
      });
        res.redirect("/page");
    }
    else
        res.redirect('/index');
});


app.get('/order/:pid', function(req, res){
    if(sess.user)
    {
        var pid=req.params.pid;
        axios.post(ngrokurl+'/order/', {
            email: sess.user,
            pid: pid
          })
      .then((response) => {
        data=response.data;
        console.log(data);
        if(data=="Order Successful")
            res.render('orderstatus', {
                message:"Order Successful",
                name:sess.name});
        else if(data=="Required")
            res.redirect("/photocheck");
      }, (error) => {
        console.log(error);
      });
    }
    else
        res.redirect('/index');
});


app.get('/signup', function(req, res){
    res.render('signup', {
        //data:JSON.stringify(req.query)
    })
});

app.post('/signup', function(req, res){
    sess=req.session;
    var reg=req.body.username;
    var pwd=req.body.password;
    var ag=req.body.age;
    var nm=req.body.name;
    axios.post(ngrokurl+'/registration/', {
        email: reg,
        password: pwd,
        name: nm,
        age: ag
      })
      .then((response) => {
        //console.log(response);
        data=response.data;
        if(data=="User already present")
            res.render('signup', {message:"User already present"});
        else{
            console.log(data);
            sess.user=reg;
            res.redirect('/photocapture');
            //res.redirect('/login');
        }
      }, (error) => {
        console.log(error);
      });
});

app.get('/admin', function(req, res){
    res.render('adminlogin', {
        //data:JSON.stringify(req.query)
    })
});

app.post('/admin', function(req, res){
    var id=req.body.username;
    var pwd=req.body.password;
    if(id!='admin')
        res.render('adminlogin', { message: "User does not exist"});
    else
        if(pwd=='admin')
        {
            sess=req.session;
            sess.user=id;
            res.redirect('/adminspage');
        }
        else
            res.render('adminlogin', { message: "Invalid Password"});
});

app.get('/adminspage', function(req, res){
    if(sess.user){
        res.render('adminspage',{
            name:sess.user,
        });
    }
    else
        res.redirect('/index');
});

app.get('/adminalltable', function(req, res){
    if(sess.user){
        axios.get(ngrokurl+'/getalltable', {})
        .then((response) => {
          data=response.data;
          console.log(data);
          res.send(data);
        }, (error) => {
          console.log(error);
        });
    }
    else
        res.redirect('/index');
});

app.get('/adminmedicine', function(req, res){
    if(sess.user){
        axios.get(ngrokurl+'/get_medicine/', {})
        .then((response) => {
          data=response.data;
          console.log(data);
          var arr=data['mid'];
          var name=data['name'];
          var auth=data['auth'];
          res.render('adminmedicine', {
              name:sess.name,
              cid: arr,
              cname: name,
              au: auth
          });
        }, (error) => {
          console.log(error);
        });
    }
    else
        res.redirect('/index');
});

app.get('/delmedicine/:mid', function(req, res){
    if(sess.user){
        var mid=req.params.mid;
        axios.post(ngrokurl+'/delmedicine/', {
            mid: mid
          })
          .then((response) => {
            //console.log(response);
            data=response.data;
            res.redirect('/adminmedicine');
          }, (error) => {
            console.log(error);
          });
    }
    else
        res.redirect('/logout');
});

app.get('/newmedicine', function(req, res){
    if(sess.user){
        res.render('newmedicine', {
            name:sess.user
        });
    }
    else
        res.redirect('/index');
});

app.post('/newmedicine', function(req, res){
    if(sess.user){
    var cid=req.body.auth;
    var cname=req.body.medicinename;
    axios.post(ngrokurl+'/upload_medicine/', {
            name: cname,
            auth: cid
          })
      .then((response) => {
        data=response.data;
        console.log(data);
        res.redirect('/adminmedicine');
      }, (error) => {
        console.log(error);
      });}
    else
      res.redirect('/index');
});

app.get('/adminuser', function(req, res){
    if(sess.user){
        axios.get(ngrokurl+'/get_user/', {})
        .then((response) => {
          data=response.data;
          console.log(data);
          var arr=data['eid'];
          var name=data['name'];
          var auth=data['age'];
          res.render('adminuser', {
              name:sess.name,
              id: arr,
              name: name,
              age: auth
          });
        }, (error) => {
          console.log(error);
        });
    }
    else
        res.redirect('/index');
});

app.get('/deluser/:eid', function(req, res){
    if(sess.user){
        var eid=req.params.eid;
        axios.post(ngrokurl+'/deluser/', {
            eid: eid
          })
          .then((response) => {
            //console.log(response);
            data=response.data;
            res.redirect('/adminuser');
          }, (error) => {
            console.log(error);
          });
    }
    else
        res.redirect('/logout');
})

app.get('/logout', function(req, res){
    sess.user=''
    //req.session.destroy();
    res.redirect('/index');
});

app.listen(3000);