const models = require("../models");
const crypto = require("crypto");
const sharp = require("sharp");
const bcrypt = require("bcrypt")
const sequelize = require('sequelize');
const Op = sequelize.Op;
const admin = require('firebase-admin');
const { sendSMS }= require("../util/sol");

const { uploadFile, getObjectSignedUrl } = require("../util/s3.js");
const {
  sendEmailPassword,
} = require("../util/resetpwd.js");
const { redisCli } = require("../util/redis-util");
const generateFileName = (bytes = 32) =>
  crypto.randomBytes(bytes).toString("hex");

module.exports = {

  //이미지
  uploadToS3: async (req, res) => {
    // #swagger.description = "이미지를 업로드합니다."
    // #swagger.tags = ["이미지"]
    // #swagger.summary = "이미지 업로드
    /* 
      #swagger.parameters['image'] = {
          in: "formData",
          description: "이미지 파일 등록",
          type: 'file',
      }
    */
    
    let file = req.file;
    const imageName = generateFileName();
    const fileBuffer = await sharp(file.buffer).toBuffer();
    let temp = await uploadFile(fileBuffer, imageName, file.mimetype); 
    res.status(201).send({ Success: temp });
  },

  fnImgUpload: async (file)=>{
    const imageName = generateFileName();
    const fileBuffer = await sharp(file.buffer).toBuffer();
    let temp = await uploadFile(fileBuffer, imageName, file.mimetype); 
    console.log(imageName,"imageName")
    console.log(temp,"temp")
    return temp;
  },

  uploadToS3Array: async (req, res) => {
    // #swagger.description = "여러 이미지를 업로드합니다."
    // #swagger.tags = ["이미지"]
    // #swagger.summary = "최대 5장 이미지 업로드
    /* 
      #swagger.consumes = ['multipart/form-data']
      #swagger.parameters['multiFiles'] = {
          in: "formData",
          description: "이미지 파일 등록",
          collectionFormat: 'multi',
          type: 'array',
          items: { type: 'file' }
      }
    */
    // let files = req.files;
    let files = req.files;
    const fileBuffer = []
    for ( var i = 0; i < files.length; i++){
      const imageName = generateFileName();
      fileBuffer[i] = await sharp(files[i].buffer).toBuffer();
      let temp = await uploadFile(fileBuffer[i], imageName, files[i].mimetype);
    }    
    res.status(201).send({ Success: "Multi files are successfully uploaded" });
  },

  getImgUrl: async (req, res) => {
    // #swagger.description = ""
    // #swagger.tags = ["이미지"]
    // #swagger.summary = ""
    let photo_url = req.params.photo_url;
    // let photo_url = "N/A";

    photo_url = await getObjectSignedUrl(photo_url);
    res.send({ photo_url: photo_url });
  },

  //아이디 찾기
  sendSMS_Username: async (req, res) => {
    // #swagger.description = "phone_number 통해 인증번호 전송"
    // #swagger.tags = ["아이디 찾기"]
    // #swagger.summary = "닉네임 찾기 인증번호 문자 전송"
    const phone_number = req.params.phone_number
    const saveAuthCode = async (key, code) => {
      await redisCli.set(key, code, { EX: 18000});
    };
    let number =""
    for(i=0;i<4;i++){
      number = number + (Math.floor(Math.random()*10))
    }
    const is_alive = await redisCli.get(phone_number)
    if(is_alive){
      await redisCli.del(phone_number);
    }
    await saveAuthCode(phone_number, number);
    let body = `인증번호는 ${number}입니다`;
    // sendSMS(phone_number, body);
    res.send(body);
  },

  sendEmail_Username: async (req, res) => {
    // #swagger.description = "email 통해 인증번호 전송"
    // #swagger.tags = ["아이디 찾기"]
    // #swagger.summary = "닉네임 찾기 인증번호 이메일 전송"
    const email = req.params.email
    const saveAuthCode = async (key, code) => {
      await redisCli.set(key, code, { EX: 18000});
    };
    
    let number =""
    for(i=0;i<4;i++){
      number = number + (Math.floor(Math.random()*10))
    }
    const is_alive = await redisCli.get(email)
    if(is_alive){
      await redisCli.del(email);
    }
    await saveAuthCode(email, number);
    await sendEmailPassword(email, number);
    res.send("Success");
  },

  FindUsername_SMS: async (req, res) => {
    // #swagger.description = "핸드폰 번호를 통해 아이디를 찾습니다"
    // #swagger.tags = ["아이디 찾기"]
    // #swagger.summary = "아이디 찾기"
    let {phone_number, number_by_user} = req.body
    const compareAuthCode = async (phone_number, number_by_user) => {
      const number_by_username = await redisCli.get(phone_number);
      console.log(number_by_username,"token_by_username");
      console.log(number_by_user,"number_by_user")
      if (number_by_user === number_by_username) {
        await redisCli.del(phone_number);
        return true;
      } else {
        return false;
      }
    };
    const is_authorized = await compareAuthCode(phone_number, number_by_user);
    console.log(is_authorized,"is_authorized")
    if(is_authorized){
      let user_info = await models.UserAccount.findOne({
        raw: true, 
        where: { 
            phone_number: phone_number
        },
        attributes: ['username']
      })
      return res.send(user_info.username)
    }
    else {res.send("wrong access or expired")}
  },

  FindUsername_Email: async (req, res) => {
    // #swagger.description = "이름, 이메일 번호를 통해 아이디를 찾습니다"
    // #swagger.tags = ["아이디 찾기"]
    // #swagger.summary = "아이디 찾기"
    let {email, number_by_user} = req.body
    const compareAuthCode = async (email, number_by_user) => {
      const number_by_username = await redisCli.get(email);
      console.log(number_by_username,"token_by_username");
      console.log(number_by_user,"number_by_user")
      if (number_by_user === number_by_username) {
        await redisCli.del(email);
        return true;
      } else {
        return false;
      }
    };
    const is_authorized = await compareAuthCode(email, number_by_user);
    console.log(is_authorized,"is_authorized")
    if(is_authorized){
      let user_info = await models.UserAccount.findOne({
        raw: true, 
        where: { 
          email: email
        },
        attributes: ['username']
      })
      return res.send(user_info.username)
    }
    else {res.send("wrong access or expired")}
  },

  //비번 재설정
  sendSMS_Password: async (req, res) => {
    // #swagger.description = "username을 통해 비밀번호 재설정을 위해 문자로 인증번호를 전송합니다"
    // #swagger.tags = ["비밀번호"]
    // #swagger.summary = "비밀번호 재설정 위한 문자 인증번호 전송"
    const username = req.params.username
    const saveAuthCode = async (key, code) => {
      await redisCli.set(key, code, { EX: 18000});
    };
    let user_info = await models.UserAccount.findOne({
        raw: true, 
        where: { 
            username: username
        },
        attributes: ['id','phone_number']
    })
    let number =""
    for(i=0;i<4;i++){
      number = number + (Math.floor(Math.random()*10))
    }
    const is_alive = await redisCli.get(username)
    if(is_alive){
      await redisCli.del(username);
    }

    console.log(username,"username")
    console.log(username==="관장1","equal")
    await saveAuthCode(username, number);
    temp = await redisCli.get(username)
    console.log(temp,"ddddd")
    let body = `인증번호는 ${number}입니다`;
    // sendSMS(user_info.phone_number, body);
    res.send(body);
  },

  sendEmail_Password: async (req, res) => {
    // #swagger.description = "username을 통해 비밀번호 재설정을 위해 이메일로 인증번호를 전송합니다"
    // #swagger.tags = ["비밀번호"]
    // #swagger.summary = "비밀번호 재설정 위한 이메일 인증번호 전송"
    const username = req.params.username
    const saveAuthCode = async (key, code) => {
      await redisCli.set(key, code, { EX: 18000});
    };
    
    let user_info = await models.UserAccount.findOne({
        raw: true, 
        where: { 
            username: username
        },
        attributes: ['id','email']
    })
    let number =""
    for(i=0;i<4;i++){
      number = number + (Math.floor(Math.random()*10))
    }
    const is_alive = await redisCli.get(username)
    if(is_alive){
      await redisCli.del(username);
    }
    await saveAuthCode(username, number);
    await sendEmailPassword(user_info.email, number);
    res.send("Success");
  },

  reset_Password: async (req, res) => {
    // #swagger.description = "username, 인증번호를 통해 새로운 비밀번호를 설정합니다"
    // #swagger.tags = ["비밀번호"]
    // #swagger.summary = "비밀번호 재설정"
    let {username, new_password, number_by_user} = req.body
    console.log(username,"username")
    console.log(number_by_user,"number_by_user")
    const compareAuthCode = async (username, number_by_user) => {
      const number_by_username = await redisCli.get(username);
      console.log(number_by_username,"token_by_username");
      console.log(number_by_user,"number_by_user")
      if (number_by_user === number_by_username) {
        await redisCli.del(username);
        return true;
      } else {
        return false;
      }
    };
    const is_authorized = await compareAuthCode(username, number_by_user);
    console.log(is_authorized,"is_authorized")
    if(is_authorized){
      new_password = await bcrypt.hash(new_password, 10);
      await models.UserAccount.update(
        {
          password : new_password
        },
        {
          where: {username: username}
        }
      )
      res.send("password successfully updated")
    }
    else {res.send("wrong access or expired")}
  },

  //초대
  sendSMS_Invitation_Teacher: async (req, res) => {
    // #swagger.description = "관장/사범 초대 sms 전송"
    // #swagger.tags = ["초대"]
    // #swagger.summary = "관장/사범 초대 sms 전송"
    const phone_number = req.params.phone_number
    let {dojang_id, recipient_type} = req.body
    if(recipient_type == "관장"){recipient_type = "KWANJANG"}
    if(recipient_type == "사범"){recipient_type = "SABUM"}
    let today = new Date()
    today.setHours(today.getHours()+9);
    let expire_date = new Date(Date.parse(today) + 7 * 24*60*60*1000 );

    let body = `태권월드로부터 초대 되었습니다`;
    let obj = new Object
    obj["phone_number"] = phone_number
    obj["body"] = body

    sendSMS(phone_number, body);
    console.log(phone_number,"phone_number")
    console.log(body,"body")

    let invitation_info_alive = await models.Invitation.findOne({
      where: {phone_number:phone_number,
        dojang: dojang_id,
        recipient_type: recipient_type,
        expire_date: {[Op.gte] : today}},
      attributes: ['id'],
      raw:true
    })
    if(invitation_info_alive){
      await models.Invitation.update(
        {
          expire_date
        },
        {
          where: {id: invitation_info_alive.id}
        }
      )
    }
    else{
      await models.Invitation.create({
        phone_number, dojang: dojang_id, recipient_type, expire_date,
        is_refused: 0
      })
    }
    res.send("Success");
  },

  sendSMS_Invitation_Teacher_Multi: async (req, res) => {
    // #swagger.description = "관장/사범 초대 sms 단체 전송"
    // #swagger.tags = ["초대"]
    // #swagger.summary = "관장/사범 초대 sms 단체 전송"
    let {dojang_id, invite_info} = req.body
    console.log(dojang_id,"dojang_id")
    console.log(invite_info,"invite_info")
    let today = new Date()
    today.setHours(today.getHours()+9);
    let expire_date = new Date(Date.parse(today) + 7 * 24*60*60*1000 );

    for(let invite_one of invite_info){
      
      if(invite_one.recipient_type == "관장"){invite_one.recipient_type = "KWANJANG"}
      if(invite_one.recipient_type == "사범"){invite_one.recipient_type = "SABUM"}
      let obj = new Object
      let body = `태권월드로부터 초대 되었습니다`;
      obj["phone_number"] = invite_one.phone_number
      obj["body"] = body
    
      sendSMS(invite_one.phone_number, body);

      let invitation_info_alive = await models.Invitation.findOne({
        where: {phone_number:invite_one.phone_number,
          dojang: dojang_id,
          recipient_type: invite_one.recipient_type,
          expire_date: {[Op.gte] : today}},
        attributes: ['id'],
        raw:true
      })
      console.log("@#@#@%@$")
      if(invitation_info_alive){
        await models.Invitation.update(
          {
            expire_date
          },
          {
            where: {id: invitation_info_alive.id}
          }
        )
      }
      else{
        temp = await models.Invitation.create({
          phone_number: invite_one.phone_number, dojang: dojang_id, 
          recipient_type: invite_one.recipient_type, expire_date,
          is_refused: 0
        })
      }
    }
    res.send("Success");
  },

  sendSMS_Invitation_User: async (req, res) => {
    // #swagger.description = "학부모/수련생 초대 sms 전송"
    // #swagger.tags = ["초대"]
    // #swagger.summary = "학부모/수련생 초대 sms 전송"
    const phone_number = req.params.phone_number
    let {dojang_id, student_id, recipient_type} = req.body

    if(recipient_type == "본인"){recipient_type = "USER"}
    if(recipient_type == "가족"){recipient_type = "FAMILY"}

    let today = new Date()
    today.setHours(today.getHours()+9);
    let expire_date = new Date(Date.parse(today) + 7 * 24*60*60*1000 );

    let body = `태권월드로부터 초대 되었습니다`;
    let obj = new Object
    obj["phone_number"] = phone_number
    obj["body"] = body
    sendSMS(phone_number, body);
    console.log(phone_number,"phone_number")
    console.log(body,"body")
    
    let invitation_info_alive = await models.Invitation.findOne({
      where: {
        phone_number:phone_number,
        dojang: dojang_id,
        student: student_id,
        recipient_type: recipient_type,
        expire_date: {[Op.gte] : today}},
      attributes: ['id'],
      raw:true
    })
    console.log(invitation_info_alive,"invitation_info_alive")
    if(invitation_info_alive){
      console.log(expire_date,"expire_date")
      await models.Invitation.update(
        {
          expire_date
        },
        {
          where: {id: invitation_info_alive.id}
        }
      )
    }
    else{
      await models.Invitation.create({
        phone_number, dojang: dojang_id, student: student_id, recipient_type, expire_date,
        is_refused: 0
      })
    }
    res.send("Success");
  },

  sendSMS_Invitation_User_Multi: async (req, res) => {
    // #swagger.description = "학부모/수련생 초대 sms 전송"
    // #swagger.tags = ["초대"]
    // #swagger.summary = "학부모/수련생 초대 sms 전송"
    let {dojang_id, student_id, invite_info} = req.body
    let today = new Date()
    today.setHours(today.getHours()+9);
    let expire_date = new Date(Date.parse(today) + 7 * 24*60*60*1000 );
    console.log(expire_date,"expire_date")
    for(let invite_one of invite_info){
      if(invite_one.recipient_type == "본인"){invite_one.recipient_type = "USER"}
      if(invite_one.recipient_type == "가족"){invite_one.recipient_type = "FAMILY"}
      let body = `태권월드로부터 초대 되었습니다`;
      let obj = new Object
      obj["phone_number"] = invite_one.phone_number
      obj["body"] = body

      sendSMS(invite_one.phone_number, body);
      
      let invitation_info_alive = await models.Invitation.findOne({
        where: {
          phone_number:invite_one.phone_number,
          dojang: dojang_id,
          student: student_id,
          recipient_type: invite_one.recipient_type,
          expire_date: {[Op.gte] : today}},
        attributes: ['id'],
        raw:true
      })
      if(invitation_info_alive){
        await models.Invitation.update(
          {
            expire_date
          },
          {
            where: {id: invitation_info_alive.id}
          }
        )
      }
      else{
        await models.Invitation.create({
          phone_number : invite_one.phone_number, dojang: dojang_id, 
          student: student_id, recipient_type: invite_one.recipient_type, expire_date,
          is_refused: 0
        })
      }
    }
    res.send("Success");
  },

  // sendBirthSMS: async (req, res) => {
  //   // #swagger.description = "관장/사범 초대 sms 전송"
  //   // #swagger.tags = ["초대"]
  //   // #swagger.summary = "관장/사범 초대 sms 전송"
  //   const job = schedule.scheduleJob('0 0 9 * * *', async function () {
  //     let today = new Date
  //     const month = today.getMonth() + 1
  //     const day = today.getDate()

  //     let today_birthday_user = await models.UserAccount.findAll({
  //         where: {birth_month: month, birth_day : day},
  //         attributes: []
  //     })
  //     let body = `태권월드로부터 초대 되었습니다`;
  //     let obj = new Object
  //     obj["phone_number"] = phone_number
  //     obj["body"] = body

  //     sendSMS(phone_number, body);
  //   });
  // },

  //안씀
  sendAuthSMS: async (req, res) => {
    // #swagger.description = "username, 인증번호를 통해 새로운 비밀번호를 설정합니다"
    // #swagger.tags = ["안씀"]
    // #swagger.summary = "비밀번호 재설정"
    let phone_number = req.params.phone_number;
    let number =""
    for(i=0;i<4;i++){
      number = number + (Math.floor(Math.random()*10))
    }
    certification_info = await models.Certification.findOne({
      where: {phone_number: phone_number},
      attributes: ['number'],
      raw:true
    })
    if(!certification_info){
      await models.Certification.create({
        phone_number, number
      })
    }
    else{
      number =""
      for(i=0;i<4;i++){
        number = number + (Math.floor(Math.random()*10))
      }
      await models.Certification.destroy({
        where:{phone_number: phone_number}
      })
      await models.Certification.create({
        phone_number, number
      })
    }
    let body = `인증번호는 ${number}입니다`;
    let obj = new Object
    obj["phone_number"] = phone_number
    obj["body"] = body
    console.log(phone_number,"phone_number")
    sendSMS(phone_number, body);
    // res.send({"Sucess":"^^^^^"})
    res.send(obj)
  },

  verifyAuthSMS: async (req, res) => {
    // #swagger.description = "username, 인증번호를 통해 새로운 비밀번호를 설정합니다"
    // #swagger.tags = ["안씀"]
    // #swagger.summary = "비밀번호 재설정"
    let email = req.params.email;
    let number = req.params.number
    certification_info = await models.Certification.findOne({
      where: {email: email},
      attributes: ['number'],
      raw:true
    })
    if(certification_info){
      if(certification_info.number == number){
        await models.Certification.destroy({
          where:{email: email}
        })
        return res.send(true)
      }
      else{
        return res.send(false)
      }
    }
    else{
      return res.send("Data expired or not exist")
    }
  },

  //FCM
  sendFCM: async (req, res)=>{
    // #swagger.description = "박기정 선임님이 만들어서 잘 모름"
    // #swagger.tags = ["FCM"]
    // #swagger.summary = "FCM 전송"
    const {title, body, user_id} = req.body;
    let token = await models.UserAccount.findAll(
      {
        attributes:["fcm_token"],
        where:{
          id: user_id,
        },
        raw:true
      }
    );
    token = token.map(el=>el.fcm_token)
    let message = {
      notification: {
          title: title,
          body: body,
          },
      tokens:token
  }
  admin
      .messaging()
      .sendMulticast(message)
      .then(function (response) {
          console.log('Successfully sent message: : ', response)
          console.log('message: : ', message)
          return res.status(200).json({success : true})
      })
      .catch(function (err) {
          console.log('Error Sending message!!! : ', err)
          return res.status(400).json({success : false})
      });
  },

  //결제
  Billings: async (req,res,next) => {
    // #swagger.description = "결제 요청"
    // #swagger.tags = ["결제"]
    // #swagger.summary = "결제 요청"
    
    try{
      const { customer_uid } = req.body; // req의 body에서 customer_uid 추출

      // 인증 토큰 발급 받기
      const getToken = await axios({
        url: "https://api.iamport.kr/users/getToken",
        method: "post", // POST method
        headers: { "Content-Type": "application/json" }, // "Content-Type": "application/json"
        data: {
          imp_key: "imp_apikey", // REST API 키
          imp_secret: "ekKoeW8RyKuT0zgaZsUtXXTLQ4AhPFW3ZGseDA6bkA5lamv9OqDMnxyeB9wqOsuO9W3Mx9YSJ4dTqJ3f" // REST API Secret
        }
      });
      const { access_token } = getToken.data.response; // 인증 토큰

      // 결제(재결제) 요청
      const paymentResult = await axios({
        url: "https://api.iamport.kr/subscribe/payments/again",
        method: "post",
        headers: { "Authorization": access_token }, // 인증 토큰을 Authorization header에 추가
        data: {
          customer_uid,
          merchant_uid: "order_monthly_0001", // 새로 생성한 결제(재결제)용 주문 번호
          amount: 8900,
          name: "월간 이용권 정기결제"
        }
      });

      const { code, message } = paymentResult;
      if (code === 0) { // 카드사 통신에 성공(실제 승인 성공 여부는 추가 판단이 필요함)
        if ( paymentResult.status === "paid" ) { //카드 정상 승인
          res.send("성공");
        } else { //카드 승인 실패 (예: 고객 카드 한도초과, 거래정지카드, 잔액부족 등)
          //paymentResult.status : failed 로 수신됨
          res.send("실패");
        }
        res.send("{ ... }");
      } else { // 카드사 요청에 실패 (paymentResult is null)
        res.send("{ ... }");
      }
    }
    catch(err){
        await res.status(500).send({
            message:
                err.message || "some error occured"
        })
    }
  },
};
