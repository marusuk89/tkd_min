const models = require("../models");
const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const { sign, refresh, verify } = require('../util/jwt-util');
const bcrypt = require("bcrypt")
const jwt = require('jsonwebtoken');
const { sendGroup } = require('../util/fcm');
const { redisCli } = require("../util/redis-util");


module.exports = {
    test: async (req, res, next) => {
        res.send("ok")
    },

    //회원가입
    register: async (req, res, next) => {
        // #swagger.description = "유저를을 등록합니다."
        // #swagger.tags = ["register"]
        // #swagger.summary = "유저 등록"
        try{
            let {username, password, role, phone_number, last_name, first_name, email,
            birth_month, birth_day } = req.body;
            
            // ID 및 비밀번호 제한
            // var num = password.search(/[0-9]/g);
            // var eng = password.search(/[a-z]/ig);
            // var spe = password.search(/[`~!@@#$%^&*|₩₩₩'₩";:₩/?]/gi);
            // if(username.length < 3){
            //     return res.send("ID는 3글자 이상으로 입력해주세요")
            // }
            // if(password.length < 8 || password.length > 16){
            //     return res.send("8자리 ~ 16자리 이내로 입력해주세요.");
            // }
            // else if(password.search(/\s/) != -1){
            //     return res.send("비밀번호는 공백 없이 입력해주세요.");
            // }
            // else if( (num < 0 && eng < 0) || (eng < 0 && spe < 0) || (spe < 0 && num < 0) ){
            //     return res.send("영문,숫자, 특수문자 중 2가지 이상을 혼합하여 입력해주세요.");
            // }
            // else {
            //     console.log("통과");	 
            // }
            password = await bcrypt.hash(password, 10);
            if (!await models.UserAccount.findOne({ where: { username: username } })) {
                await models.UserAccount.create({ 
                    username, password, role, phone_number, last_name, first_name, email,
                    birth_month, birth_day });
                res.send("Done");
            }
            else {
                res.send("username exist")
            }
        }
        catch(err){
            await res.status(500).send({
                message:
                    err.message || "some error occured"
            })
        }
    },

    //로그인
    login: async (req, res, next) => {
        // #swagger.description = "로그인합니다.."
        // #swagger.tags = ["login"]
        // #swagger.summary = "로그인"
        /* #swagger.parameters['association_name'] = {
            in: "query",
            type: "string"
        },
        #swagger.parameters['country_code'] = {
            in: "query",
            type: "string"
        },
        */
        try{
            const { username, password } = req.body;
            const association_name = req.query.association_name
            const country_code = req.query.country_code
            
            user = await models.UserAccount.findOne({ raw: true, where: { username: username } })
            if(user.role == "ASSOCIATION"){
                is_right_association = await models.AssociationInfos.findOne({
                    where: {country_code:country_code, name:association_name, user:user.id},
                    raw: true
                })
                console.log(is_right_association,"is_right_association")
                if(!is_right_association){
                    return res.send("wrong association")
                }
            }
            else if((user.role != "ASSOCIATION") && (association_name || country_code)){
                return res.send("id is not association")
            }

            if (user && await bcrypt.compare(password, user.password)) {
                const accessToken = await sign(user);
                const refreshToken = refresh();
                await models.Refresh.create({ userID: user.id, refreshToken: refreshToken })
                res.status(200).send({ // client에게 토큰 모두를 반환합니다.
                    ok: true,
                    data: {
                        accessToken,
                        refreshToken,
                    },
                });
            }
            else {
                res.status(401).send({
                    ok: false,
                    message: 'password is incorrect',
                });
            }
        }
        catch(err){
            await res.status(500).send({
                message:
                    err.message || "some error occured"
            })
        }
    },

    //중복 체크
    Is_Username_Duplicate: async (req, res, next) => {
        // #swagger.description = "username 중복 체크"
        // #swagger.tags = ["중복 체크"]
        // #swagger.summary = "username 중복 체크"
        try{
            const username = req.params.username
            let user_info = await models.UserAccount.findOne({
                raw: true, 
                where: { 
                    username: username
                },
                attributes: ['id']
            })
            
            if(user_info){
                return res.send(true)
            }
            else{
                return res.send(false)
            }
        }
        catch(err){
            await res.status(500).send({
                message:
                    err.message || "some error occured"
            })
        }
    },

    Is_PhoneNumber_Duplicate: async (req, res, next) => {
        // #swagger.description = "phonenumber 중복 체크"
        // #swagger.tags = ["중복 체크"]
        // #swagger.summary = "phonenumber 중복 체크"
        try{
            const phone_number = req.params.phone_number
            let user_info = await models.UserAccount.findOne({
                raw: true, 
                where: { 
                    phone_number: phone_number
                },
                attributes: ['id']
            })
            
            if(user_info){
                return res.send(true)
            }
            else{
                return res.send(false)
            }
        }
        catch(err){
            await res.status(500).send({
                message:
                    err.message || "some error occured"
            })
        }
    },

    //닉네임 찾기
    FindUsernameEmail: async (req, res, next) => {
        // #swagger.description = "이메일을 통해 username을 찾습니다"
        // #swagger.tags = ["아이디 찾기"]
        // #swagger.summary = "username 찾기"
        try{
            const email = req.params.email
            const last_name = req.params.last_name
            const first_name = req.params.first_name
            
            let user_info = await models.UserAccount.findOne({
                raw: true, 
                where: { 
                    email: email,
                    last_name: last_name,
                    first_name: first_name
                },
                attributes: ['username']
            })
            
            if(user_info){
                return res.send(user_info.username)
            }
            else{
                return res.send("Wrong input")
            }
        }
        catch(err){
            await res.status(500).send({
                message:
                    err.message || "some error occured"
            })
        }
    },

    FindUsernamePhone: async (req, res, next) => {
        // #swagger.description = "핸드폰을 통해 username을 찾습니다"
        // #swagger.tags = ["아이디 찾기"]
        // #swagger.summary = "username 찾기"
        try{
            const phone_number = req.params.phone_number
            const last_name = req.params.last_name
            const first_name = req.params.first_name
            
            let user_info = await models.UserAccount.findOne({
                raw: true, 
                where: { 
                    phone_number: phone_number,
                    last_name: last_name,
                    first_name: first_name
                },
                attributes: ['username']
            })
            
            if(user_info){
                return res.send(user_info.username)
            }
            else{
                return res.send("Wrong input")
            }
        }
        catch(err){
            await res.status(500).send({
                message:
                    err.message || "some error occured"
            })
        }
    },

    //내 설정 바꾸기
    ChangeMyInfo: async (req, res, next) => {
        // #swagger.description = "내 정보를 수정합니다"
        // #swagger.tags = ["유저"]
        // #swagger.summary = "내 정보 수정"
        try{
            const auth_id = req.id
            const auth_role = req.role
            console.log(auth_id,"auth_id")
            let { current_password, new_password, email, phone_number } = req.body  
            let user_info = await models.UserAccount.findOne({
                where: {id:auth_id},
                raw:true
            }) 
            console.log(auth_id,"auth_id")
            console.log(current_password,"current_password")
            console.log(current_password && new_password,"??")
            if(current_password && new_password){
                console.log(auth_id,"auth_id")
                if (user_info && await bcrypt.compare(current_password, user_info.password)){
                    new_password = await bcrypt.hash(new_password, 10);
                    await models.UserAccount.update(
                        {
                            password: new_password, email, phone_number
                        },
                        {
                            where: {id: auth_id}
                        }
                    )
                    if(auth_role == "KWANJANG"){
                        await models.KwanjangInfo.update({phone_number, email},
                            {where: {user: auth_id},}
                        )}
                    else if(auth_role == "SABUM"){
                        await models.Sabum.update({phone_number, email},
                            {where: {user: auth_id},}
                        )}
                    else if(auth_role == "FAMILY"){
                        await models.ParentsInfo.update({phone_number, email},
                            {where: {user: auth_id},}
                        )}
                    else if(auth_role == "STUDENT"){
                        await models.StudentInfo.update({phone_number, email},
                            {where: {user: auth_id},}
                        )}
                    res.send("MyInfo is successfully updated")
                }
                else{
                    res.send("wrong password")
                }
            }
            else{
                await models.UserAccount.update(
                    {
                        email, phone_number
                    },
                    {
                        where: {id: auth_id}
                    }
                )
                if(auth_role == "KWANJANG"){
                    await models.KwanjangInfo.update({phone_number, email},
                        {where: {user: auth_id},}
                    )}
                else if(auth_role == "SABUM"){
                    await models.Sabum.update({phone_number, email},
                        {where: {user: auth_id},}
                    )}
                else if(auth_role == "FAMILY"){
                    await models.ParentsInfo.update({phone_number, email},
                        {where: {user: auth_id},}
                    )}
                else if(auth_role == "STUDENT"){
                    await models.StudentInfo.update({phone_number, email},
                        {where: {user: auth_id},}
                    )}
                res.send("MyInfo is successfully updated")
            }
            
        }
        catch(err){
            await res.status(500).send({
                message:
                    err.message || "some error occured"
            })
        }
    },

    //출석
    AttendancesCreate: async (req, res, next) => {
        // #swagger.description = "출석 정보를 생성 합니다"
        // #swagger.tags = ["출석"]
        // #swagger.summary = "출석 생성"

        try{
            const student_id = req.params.student_id;
            const dojang_id = req.params.dojang_id;

            let user_id = []
            
            let student_info = await models.StudentInfo.findOne({
                where: {id: student_id},
                raw:true
            })
            if(!student_info){
                return res.send("Student does not exist")
            }
            is_linked_dojang = await models.StudentInfo.findOne({
                where: {id:student_id, dojang: dojang_id},
                raw:true
            })
            if(!is_linked_dojang){
                return res.send("Student does not linked with dojang")
            }
            let attendance_info = await models.Attendance.findOne({
                where: {student: student_id},
                raw:true
            })
            if(attendance_info){
                await models.Attendance.destroy({
                    where: {student: student_id}
                })
            }
            await models.Attendance.create({ is_attended: 1, student: student_id })

            //학부모 대상 알림
            let parentsstudent_info = await models.ParentsStudents.findAll({
                where: {student: student_id},
                attributes: ['parents'],
                raw:true
            })
            for(let parentsstudent_one of parentsstudent_info){
                let parents_info = await models.ParentsInfo.findOne({
                    where: {id: parentsstudent_one.parents},
                    attributes: ['user'],
                    raw:true
                })
                console.log(parents_info,"parents_info")
                if(parents_info){
                    user_id.push(parents_info.user)
                }
            }
            console.log(user_id,"user_id")

            let notice_title = "출석 알림"
            let notice_body = ` ${student_info.last_name}${student_info.last_name} 수련생 출석`
            //토큰 발행
            let tokens = await models.UserAccount.findAll(
                {
                    attributes:["fcm_token"],
                    where:{
                        id: user_id,
                        fcm_token: { [Op.ne]: null}
                    },
                    raw:true
                }
            );
            if(tokens.length != 0){
                console.log(tokens)
                tokens = tokens.map(el=>el.fcm_token)
                // console.log(tokens,"tokens")
                sendGroup(tokens, notice_title, notice_body)
            }
            res.send("Attendances Successfully created")
        }
        catch(err){
            await res.status(500).send({
                message:
                    err.message || "some error occured"
            })
        }
    },

    AttendancesRead: async (req, res, next) => {
        // #swagger.description = "출석 정보를 조회 합니다"
        // #swagger.tags = ["안씀"]
        // #swagger.summary = "출석 조회"
        student_id = req.params.student_id;
        models.Attendances.findAll({
            where: {
                student: student_id
            },
            include: [
                {
                    model: models.UserAccount,
                    required: true,
                    attributes: ['username'],
                }
            ]
        })
            .then(data => {
                res.send(data);
            })
            .catch(err => {
                res.status(500).send({
                    message:
                        err.message || "some error occured"
                })
            })
    },

    AttendancesUpdate: async (req, res, next) => {
        // #swagger.description = "출석 정보를 수정 합니다"
        // #swagger.tags = ["출석"]
        // #swagger.summary = "출석 수정"

        try{
            const attendance_id = req.params.attendance_id
            let { is_attended } = req.body
            console.log(is_attended,"is_attended")
            await models.Attendance.update(
                {
                    is_attended: is_attended
                },
                {
                    where: {id : attendance_id}
                }
            ).then(res.send("successdd"))
            
        }
        catch(err){
            await res.status(500).send({
                message:
                    err.message || "some error occured"
            })
        }
    },

    KwanjangSabumLogin: async (req, res, next) => {
        // #swagger.description = "운전 운행시 필요한 관장/사범용 로그인 api"
        // #swagger.tags = ["유저"]
        // #swagger.summary = "관장/사범 로그인"
        try{
            const { username, password } = req.body;
            user = await models.UserAccount.findOne({ 
                raw: true, 
                where: { 
                    username: username,
                    [Op.or]: [{role: "KWANJANG"},{role: "SABUM"}]
                } 
            })
            if(!user){
                return res.send("It is not kwanjang/sabum")
            }
            if (user && await bcrypt.compare(password, user.password)) {
                const accessToken = await sign(user);
                const refreshToken = refresh();
                await models.Refresh.create({ userID: user.id, refreshToken: refreshToken })
                res.status(200).send({ // client에게 토큰 모두를 반환합니다.
                    ok: true,
                    data: {
                        accessToken,
                        refreshToken,
                    },
                });
            }
            else {
                res.status(401).send({
                    ok: false,
                    message: 'password is incorrect',
                });
            }
        }
        catch(err){
            await res.status(500).send({
                message:
                    err.message || "some error occured"
            })
        }
    },

    //유저 조회
    UserInfoRead: async (req, res, next) => {
        // #swagger.description = "내 정보를 수정합니다"
        // #swagger.tags = ["안씀"]
        // #swagger.summary = "내 정보 수정"
        date = req.params.date;
        class_id = req.params.class_id;
        models.Attendances.findAll({
            include: [
                {
                    model: models.UserAccount,
                    attributes: ['username'],
                }
            ]
        })
            .then(data => {
                res.send(data);
            })
            .catch(err => {
                res.status(500).send({
                    message:
                        err.message || "some error occured"
                })
            })
    },

    registerFcmToken: async (req, res) => {
        // #swagger.description = "FCM 정보 생성"
        // #swagger.tags = ["FCM"]
        // #swagger.summary = "FCM 정보 생성"
        try{
            let {token, user_id} = req.body;
            console.log(token)
            await models.UserAccount.update(
                {
                    fcm_token:token
                },
                {
                    where:{
                        id:user_id
                    }
                }
            );
        res.send("Token is successfully registered")
        }catch (err) {
            console.error(err);
        }
    },

    testUserLogIn: async (req, res)=>{
        // #swagger.description = "헤더정보를 통해 토큰 verify 체크"
        // #swagger.tags = ["테스트"]
        // #swagger.summary = "토큰 테스트"
        try{
            let token  = req.headers["authorization"].split(" ")[1];
            console.log(jwt.verify(token, "Hello"));
            console.log(verify(token));
        }catch(err){
            console.error(err)
        }
    },

    FcmTokenUpdate: async (req, res)=>{
        // #swagger.description = "FCM 정보 수정"
        // #swagger.tags = ["FCM"]
        // #swagger.summary = "FCM 정보 수정"
        try{
            const data = req.body
            await models.UserAccount.update(
                {
                    fcm_token: data.fcm_token
                },
                {
                    where: { id : data.id }
                },
            res.send("fcm token updated")
            )
        }catch(err){
            console.error(err)
        }
    },

    //user_id로 유저 찾기
    FindUser: async (req, res)=>{
        /* #swagger.description = "useraccount의 id로 계정에 연결된 정보를 조회 합니다 <br />
        */
        // #swagger.tags = ["유저"]
        // #swagger.summary = "계정 -> role에 해당하는 정보 조회"
        try{
            let obj = new Object;
            const user_id = req.params.user_id
            const Account_info = await models.UserAccount.findOne({
                where: {id: user_id},
                attributes: ['id','role','username'],
                raw:true
            })
            obj["Account_info"] = Account_info

            if(Account_info.role == 'SABUM'){
                const User_info = await models.Sabum.findOne({
                    where : {user : user_id}
                })
                obj["User_info"] = User_info
            }
            else if(Account_info.role == 'KWANJANG'){
                const User_info = await models.KwanjangInfo.findOne({
                    where : {user : user_id}
                })
                obj["User_info"] = User_info
            }
            else if(Account_info.role == 'STUDENT'){
                let is_newnote = await models.Note.findAll({
                    where: {is_read: 0, recipient: user_id},
                    raw: true
                })
                // console.log(is_newnote[0],"is_newnote")
                if(is_newnote[0]){
                    obj["is_newnote"] = 1
                }
                else{
                    obj["is_newnote"] = 0
                }
                const User_info = await models.StudentInfo.findOne({
                    where : {user : user_id},
                    include: {
                        model: models.Class,
                        attributes: ['id','title'],
                        through: {
                            attirbutes: []
                        }
                    }
                })
                obj["User_info"] = User_info
            }
            else if(Account_info.role == 'FAMILY'){
                const User_info = await models.ParentsInfo.findOne({
                    where : {user : user_id}
                })
                obj["User_info"] = User_info
            }
            
            return res.send(obj)
        }
        catch(err){
            await res.status(500).send({
                message:
                    err.message || "some error occured"
            })
        }
    },

    Is_Linked: async (req, res)=>{
        // #swagger.description = "계정이 연결되어 있는지 체크"
        // #swagger.tags = ["유저"]
        // #swagger.summary = "계정이 연결되어 있는지 체크"
        
        try{
            const auth_id = req.id
            const auth_role = req.role
            console.log(auth_role,"auth_role")
            let user_info = await models.UserAccount.findOne({
                where: {id: auth_id},
                raw:true
            })
            if(auth_role == "KWANJANG"){
                let kwanjang_info = await models.KwanjangInfo.findOne({
                    where: {user: auth_id},
                    raw:true
                })
                if(kwanjang_info){
                    kwanjang_info['username'] = user_info.username
                    return res.send(kwanjang_info)
                }
                else{
                    return res.send({"message":"user is not associated with kwanjang"})
                }
            }
            else if(auth_role == "SABUM"){
                let sabum_info = await models.Sabum.findOne({
                    where: {user: auth_id},
                    attirbutes: ['id'],
                    raw:true
                })
                if(sabum_info){
                    sabum_info['username'] = user_info.username
                    return res.send(sabum_info)
                }
                else{
                    return res.send({"message":"user is not associated with sabum"})
                }
            }
            else if(auth_role == "FAMILY"){
                let parents_info = await models.ParentsInfo.findOne({
                    where: {user: auth_id},
                    attirbutes: ['id'],
                    raw:true
                })
                if(parents_info){
                    parents_info['username'] = user_info.username
                    return res.send(parents_info)
                }
                else{
                    return res.send({"message":"user is not associated with parents"})
                }
            }
            else if(auth_role == "STUDENT"){
                
                let student_info = await models.StudentInfo.findOne({
                    where: {user: auth_id},
                    raw:true
                })
                let classstudent_info = await models.ClassStudent.findOne({
                    where: {student: student_info.id},
                    attributes: ['class'],
                    raw:true
                })
                if(classstudent_info){
                    let class_info = await models.Class.findOne({
                        where: {id: classstudent_info.class},
                        raw:true
                    })
                    student_info['class_id'] = class_info.id
                    student_info['class_name'] = class_info.title
                }
                else{
                    student_info['class_id'] = ""
                    student_info['class_name'] = ""
                }
                
                console.log(student_info,"student_info")
                let level = new Object
                let level_info = await models.LevelInfo.findOne({
                    where: {
                        dojang_fk_id: student_info.dojang, 
                        level_name: student_info.level
                    },
                    raw:true
                })
                if(level_info){
                    level = level_info
                }
                let levelup_info = await models.LevelUpInfo.findAll({
                    where: {
                        student: student_info.id
                    },
                    attributes: ['levelup_date'],
                    raw:true,
                    order: [['levelup_date','desc']],
                })
                if(student_info){
                    student_info['belt_name'] = level.belt_name
                    student_info['belt_img_url'] = level.belt_img_url
                    if(levelup_info.length>0){
                        student_info['levelup_date'] = levelup_info[0].levelup_date
                    }
                    else{
                        student_info['levelup_date'] = ""
                    }
                    student_info['username'] = user_info.username
                    return res.send(student_info)
                }
                else{
                    return res.send({"message":"user is not associated with student"})
                }
            }
            else if(auth_role == "ASSOCIATION"){
                let association_info = await models.AssociationInfos.findOne({
                    where: {user: auth_id},
                    attirbutes: ['id'],
                    raw:true
                })
                if(association_info){
                    association_info['username'] = user_info.username
                    return res.send(association_info)
                }
                else{
                    return res.send({"message":"user is not associated with association"})
                }
            }
            
            res.send({"message":"wrong output"})
        }
        catch(err){
            await res.status(500).send({
                message:
                    err.message || "some error occured"
            })
        }
    },

    Is_Linked2: async (req, res)=>{
        // #swagger.description = "계정이 연결되어 있는지 체크"
        // #swagger.tags = ["유저"]
        // #swagger.summary = "계정이 연결되어 있는지 체크"
        
        try{
            const auth_id = req.id
            const auth_role = req.role
            console.log(auth_role,"auth_role")
            let user_info = await models.UserAccount.findOne({
                where: {id: auth_id},
                raw:true
            })
            if(auth_role == "KWANJANG"){
                let kwanjang_info = await models.KwanjangInfo.findOne({
                    where: {user: auth_id},
                    raw:true
                })
                if(kwanjang_info){
                    kwanjang_info['username'] = user_info.username
                    return res.send(kwanjang_info)
                }
                else{
                    return res.send({"message":"user is not associated with kwanjang"})
                }
            }
            else if(auth_role == "SABUM"){
                let sabum_info = await models.Sabum.findOne({
                    where: {user: auth_id},
                    attirbutes: ['id'],
                    raw:true
                })
                if(sabum_info){
                    sabum_info['username'] = user_info.username
                    return res.send(sabum_info)
                }
                else{
                    return res.send({"message":"user is not associated with sabum"})
                }
            }
            else if(auth_role == "FAMILY"){
                let parents_info = await models.ParentsInfo.findOne({
                    where: {user: auth_id},
                    attirbutes: ['id'],
                    raw:true
                })
                if(parents_info){
                    parents_info['username'] = user_info.username
                    return res.send(parents_info)
                }
                else{
                    return res.send({"message":"user is not associated with parents"})
                }
            }
            else if(auth_role == "STUDENT"){
                
                let student_info = await models.StudentInfo.findOne({
                    where: {user: auth_id},
                    raw:true
                })
                let classstudent_info = await models.ClassStudent.findOne({
                    where: {student: student_info.id},
                    attributes: ['class'],
                    raw:true
                })
                if(classstudent_info){
                    let class_info = await models.Class.findOne({
                        where: {id: classstudent_info.class},
                        raw:true
                    })
                    student_info['class_id'] = class_info.id
                    student_info['class_name'] = class_info.title
                }
                else{
                    student_info['class_id'] = ""
                    student_info['class_name'] = ""
                }
                
                console.log(student_info,"student_info")
                let level = new Object
                let level_info = await models.LevelInfo.findOne({
                    where: {
                        dojang_fk_id: student_info.dojang, 
                        level_name: student_info.level
                    },
                    raw:true
                })
                if(level_info){
                    level = level_info
                }
                let levelup_info = await models.LevelUpInfo.findAll({
                    where: {
                        student: student_info.id
                    },
                    attributes: ['levelup_date'],
                    raw:true,
                    order: [['levelup_date','desc']],
                })
                if(student_info){
                    student_info['belt_name'] = level.belt_name
                    student_info['belt_img_url'] = level.belt_img_url
                    if(levelup_info.length>0){
                        student_info['levelup_date'] = levelup_info[0].levelup_date
                    }
                    else{
                        student_info['levelup_date'] = ""
                    }
                    student_info['username'] = user_info.username
                    return res.send(student_info)
                }
                else{
                    return res.send({"message":"user is not associated with student"})
                }
            }
            else if(auth_role == "ASSOCIATION"){
                let association_info = await models.AssociationInfos.findOne({
                    where: {user: auth_id},
                    attirbutes: ['id'],
                    raw:true
                })
                if(association_info){
                    association_info['username'] = user_info.username
                    return res.send(association_info)
                }
                else{
                    return res.send({"message":"user is not associated with association"})
                }
            }
            
            res.send({"message":"wrong output"})
        }
        catch(err){
            await res.status(500).send({
                message:
                    err.message || "some error occured"
            })
        }
    },

    //접속한 계정이 초대장이 있는지 
    Is_Invited: async (req, res)=>{
        // #swagger.description = "계정에 초대장이 있는지 체크"
        // #swagger.tags = ["초대"]
        // #swagger.summary = "계정에 초대장이 있는지 체크"
        try{
            console.log(req.id,"req.id")
            const auth_id = req.id
            const auth_role = req.role
            let result_obj = new Object
            let result_arr = []
            let today = new Date()
            today.setHours(today.getHours()+9);

            //유저 정보
            let user_info = await models.UserAccount.findOne({
                where: {id: auth_id},
                attributes: ['last_name','first_name','phone_number','email'],
                raw:true
            })
            //기한이 만료된건 지우기
            await models.Invitation.destroy({
                where: {
                    phone_number:user_info.phone_number,
                    expire_date: {[Op.lt] : today}},
            })
            //기한이 살아 있는 초대장만 검색
            let invite_info = await models.Invitation.findAll({
                where: {
                    phone_number:user_info.phone_number,
                    // recipient_type: auth_role,
                    expire_date: {[Op.gte] : today},
                    is_refused: 0
                },
                attributes: ['id','dojang','student','expire_date','recipient_type'],
                raw:true
            })
            
            //관장 혹은 사범이 접속한 경우
            if(auth_role == 'KWANJANG' || auth_role == 'SABUM'){
                //초대장이 하나 이상일시
                if(invite_info.length > 0){
                    for(let invite_one of invite_info){
                        let invite_obj = new Object
                        let dojang_info = await models.Dojang.findOne({
                            where: {id: invite_one.dojang},
                            attributes: ['id','name','logo_img','address_name','address_detail','phone_number','is_alive'],
                            raw:true
                        })
                        if(dojang_info.is_alive == 1){
                            let sabum_info = await models.SabumDojang.findAll({
                                where: {dojang: dojang_info.id}
                            })
                            sabum_count = sabum_info.length
                            
                            let student_info = await models.StudentInfo.findAll({
                                where: {dojang: dojang_info.id}
                            })
                            student_count = student_info.length

                            invite_obj["id"] = invite_one.id
                            invite_obj["dojang"] = invite_one.dojang
                            invite_obj["student"] = invite_one.student
                            invite_obj["recipient_type"] = invite_one.recipient_type
                            invite_obj["expire_date"] = invite_one.expire_date
                            invite_obj["user_info"] = user_info
                            invite_obj["dojang_info"] = dojang_info
                            invite_obj["sabum_count"] = sabum_count
                            invite_obj["student_count"] = student_count
                            result_arr.push(invite_obj)
                        }
                    }
                    result_obj["invite_info"] = result_arr
                }
                else{return res.send({})}

                return res.send(result_obj)
            }
            //접속한 사람이 USER(아무것도 링크가 안된 상태)이거나 학부모인 경우
            else if(auth_role == 'USER' || auth_role == 'FAMILY'){
                
                if(invite_info.length > 0){
                    for(let invite_one of invite_info){
                        let dojang_info = await models.Dojang.findOne({
                            where: {id: invite_one.dojang},
                            raw:true
                        })
                        let invite_obj = new Object
                        let student_info = await models.StudentInfo.findOne({
                            where: {id: invite_one.student},
                            attributes: ['id','last_name','first_name','dob','sex','photo_url'],
                            raw:true
                        })
                        invite_obj["id"] = invite_one.id
                        invite_obj["dojang_id"] = invite_one.dojang
                        invite_obj["dojang_name"] = dojang_info.name
                        invite_obj["dojang_logo"] = dojang_info.logo_img
                        invite_obj["student"] = invite_one.student
                        invite_obj["recipient_type"] = invite_one.recipient_type
                        invite_obj["expire_date"] = invite_one.expire_date
                        invite_obj["user_info"] = user_info
                        invite_obj["student_info"] = student_info
                        console.log(invite_obj,"invite_obj")
                        result_arr.push(invite_obj)
                    }
                    console.log(result_arr,"result_arr")
                    result_obj["invite_info"] = result_arr
                }
                else{return res.send({})}

                return res.send(result_obj)
            }
        }
        catch(err){
            await res.status(500).send({
                message:
                    err.message || "some error occured"
            })
        }
    },

    //계정 -> 공지 
    Alarm_notice: async (req, res)=>{
        // #swagger.description = "알림 - 공지"
        // #swagger.tags = ["유저"]
        // #swagger.summary = "알림 - 공지"
        try{
            const dojang_id = req.params.dojang_id
            const auth_id = req.id
            const auth_role = req.role
            const {class_id} =req.body
            console.log(auth_role,"auth_role")
            console.log(auth_id,"auth_id")
            let result_arr = []

            //도장 정보
            let dojang_info = await models.Dojang.findOne({
                where: {id: dojang_id},
                attributes:['name'],
                raw:true
            })

            //접속한 계정이 관장인 경우 (모든 반 해당)
            if(auth_role == 'KWANJANG'){
                console.log(auth_role,"auth_role")
                //모든 반
                let classnotice_info = await models.ClassNotice.findAll({
                    where:{dojang: dojang_id},
                    attributes:['id','class','notice','createdAt'],
                    raw:true,
                    group: 'ClassNotice.notice',
                    order: [['createdAt','desc']]
                })
                for(let classnotice_one of classnotice_info){
                    is_entire = 0
                    if(classnotice_one.class==null){
                        is_entire = 1
                    }
                    let notice_info = await models.Notice.findOne({
                        where: {id: classnotice_one.notice},
                        raw:true
                    })
                    notice_info['is_entire'] = is_entire
                    result_arr.push(notice_info)
                }
                return res.send(result_arr)
            }
            //접속한 계정이 사범인 경우 (해당 반만)
            else if(auth_role == 'SABUM'){
                console.log(auth_role,"auth_role")
                let sabum_info = await models.Sabum.findOne({
                    where: {user:auth_id},
                    attributes: ['id'],
                    raw: true
                })
                let sabumclass_info = await models.SabumClass.findAll({
                    where: {sabum: sabum_info.id},
                    attributes: ['class'],
                    raw:true
                })
                class_arr = []
                for(let sabumclass_one of sabumclass_info){
                    class_arr.push(sabumclass_one.class)
                }
                //각각의 반 마다
                let classnotice_info = await models.ClassNotice.findAll({
                    where:{
                        dojang: dojang_id,
                        class: {[Op.or]: [null,class_arr]}
                    },
                    attributes:['id','class','notice','createdAt'],
                    raw:true,
                    group: 'ClassNotice.notice',
                    order: [['createdAt','desc']]
                })
                //각각의 알림마다
                for(let classnotice_one of classnotice_info){
                    console.log(classnotice_one,"classnotice_one")
                    is_entire = 0
                    if(classnotice_one.class==null){
                        is_entire = 1
                    }
                    let notice_info = await models.Notice.findOne({
                        where: {id: classnotice_one.notice},
                        raw:true
                    })
                    notice_info['is_entire'] = is_entire
                    result_arr.push(notice_info)
                }
                return res.send(result_arr)
                
            }
            else if(auth_role == 'STUDENT'){
                console.log(auth_role,"auth_role")
                let student_info = await models.StudentInfo.findOne({
                    where: {user:auth_id},
                    attributes: ['id'],
                    raw: true
                })
                let classstudent_info = await models.ClassStudent.findOne({
                    where: {student: student_info.id},
                    attributes: ['class'],
                    raw:true
                })
                console.log(classstudent_info,"classstudent_info")
                //각각의 반 마다
                let classnotice_info = await models.ClassNotice.findAll({
                    where:{
                        dojang: dojang_id,
                        class: {[Op.or]: [null,classstudent_info.class]}
                    },
                    attributes:['id','class','notice','createdAt'],
                    raw:true,
                    group: 'ClassNotice.notice',
                    order: [['createdAt','desc']]
                })
                //각각의 공지마다
                for(let classnotice_one of classnotice_info){
                    console.log(classnotice_one,"classnotice_one")
                    is_entire = 0
                    if(classnotice_one.class==null){
                        is_entire = 1
                    }
                    let notice_info = await models.Notice.findOne({
                        where: {id: classnotice_one.notice},
                        raw:true
                    })
                    notice_info['is_entire'] = is_entire
                    result_arr.push(notice_info)
                }
                return res.send(result_arr)
                
            }
            else if(auth_role == 'PARENTS'){
                let classnotice_info = await models.ClassNotice.findAll({
                    where:{
                        dojang: dojang_id,
                        class: {[Op.or]: [null,class_id]}
                    },
                    attributes:['id','class','notice','createdAt'],
                    raw:true,
                    group: 'ClassNotice.notice',
                    order: [['createdAt','desc']]
                })
                //각각의 공지마다
                for(let classnotice_one of classnotice_info){
                    console.log(classnotice_one,"classnotice_one")
                    is_entire = 0
                    if(classnotice_one.class==null){
                        is_entire = 1
                    }
                    let notice_info = await models.Notice.findOne({
                        where: {id: classnotice_one.notice},
                        raw:true
                    })
                    notice_info['is_entire'] = is_entire
                    result_arr.push(notice_info)
                }
                return res.send(result_arr)
                
            }
        }
        catch(err){
            await res.status(500).send({
                message:
                    err.message || "some error occured"
            })
        }
    },

    //핸드폰 번호 변경
    ChangePhoneNumber: async (req, res) => {
        // #swagger.description = "인증번호를 통해 핸드폰 번호를 변경합니다"
        // #swagger.tags = ["유저"]
        // #swagger.summary = "핸드폰 번호 변경"
        let auth_id = req.id
        let auth_role = req.role
        console.log(auth_id,"auth_id")
        let {number_by_user, new_phone_number} = req.body
        
        const compareAuthCode = async (new_phone_number, number_by_user) => {
            const number_by_username = await redisCli.get(new_phone_number);
            console.log(number_by_username,"token_by_username");
            console.log(number_by_user,"number_by_user")
            if (number_by_user === number_by_username) {
                await redisCli.del(new_phone_number);

                return true;
            } else {
                return false;
            }
        };
        const is_authorized = await compareAuthCode(new_phone_number, number_by_user);
        console.log(is_authorized,"is_authorized")
        if(is_authorized){
            await models.UserAccount.update(
                {
                    phone_number : new_phone_number
                },
                { 
                    where: {id: auth_id}
                },
            )
            if(auth_role == "KWANJANG"){
                let kwanjang_info = await models.KwanjangInfo.findOne({
                where: {user: auth_id},
                raw:true
                })
                if(kwanjang_info){
                    await models.KwanjangInfo.update(
                        {
                        phone_number: new_phone_number
                        },
                        {
                        where: {user: auth_id}
                        }
                    )
                }
            }
            else if(auth_role == "SABUM"){
                let sabum_info = await models.Sabum.findOne({
                where: {user: auth_id},
                raw:true
                })
                if(sabum_info){
                await models.Sabum.update(
                    {
                    phone_number: new_phone_number
                    },
                    {
                    where: {user: auth_id}
                    }
                )
                }
            }
            else if(auth_role == "STUDENT"){
                let student_info = await models.StudentInfo.findOne({
                where: {user: auth_id},
                raw:true
                })
                if(student_info){
                await models.StudentInfo.update(
                    {
                    phone_number: new_phone_number
                    },
                    {
                    where: {user: auth_id}
                    }
                )
                }
            }
            else if(auth_role == "FAMILY"){
                let parents_info = await models.ParentsInfo.findOne({
                where: {user: auth_id},
                raw:true
                })
                if(parents_info){
                await models.ParentsInfo.update(
                    {
                    phone_number: new_phone_number
                    },
                    {
                    where: {user: auth_id}
                    }
                )
            }
        }

        return res.send("successfully updated")
        }
        else {res.send("wrong access or expired")}
    },

    //계정 -> 알림장 
    Alarm_note: async (req, res)=>{
        // #swagger.description = "알림 - 공지"
        // #swagger.tags = ["유저"]
        // #swagger.summary = "알림 - 공지"
        try{
            const dojang_id = req.params.dojang_id
            const auth_id = req.id
            const auth_role = req.role
            const {student_id} =req.body
            console.log(auth_id,"auth_id")

            let dojang_info = await models.Dojang.findOne({
                where: {id: dojang_id},
                attributes:['name'],
                raw:true
            })

            //접속한 계정이 관장인 경우 (모든 반 해당)
            if(auth_role == 'KWANJANG'){
                //모든 반(sender가 누군지 상관 없음)
                let note_info = await models.Note.findAll({
                    where:{sender_type: "STUDENT", recipient_dojang: dojang_id},
                    attributes: ['id','contents','createdAt','real_sender'],
                    raw:true,
                    order: [['createdAt','desc']]
                })
                //데이터 가공(댓글 createdAt 합치기)
                for(let note_one of note_info){
                    let notereply_info = await models.NoteReply.findAll({
                        where: {note: note_one.id},
                        attributes: ['createdAt'],
                        order: [['createdAt','desc']],
                        raw:true
                    })
                    
                    if(notereply_info[0]){
                        if(note_one.createdAt <= notereply_info[0].createdAt)
                        {
                            note_one.createdAt = notereply_info[0].createdAt
                        }
                    }
                }
                
                //배열 내 객체 정렬
                note_info.sort(function(a,b){
                    return b.createdAt - a.createdAt
                })

                for(let note_one_new of note_info){
                    user_info = new Object
                    let sender_info = await models.UserAccount.findOne({
                        where: {id: note_one_new.real_sender},
                        attributes: ['role'],
                        raw: true
                    })
                    if(sender_info.role == 'FAMILY'){
                        user_info = await models.ParentsInfo.findOne({
                            where: {user: note_one_new.real_sender},
                            attributes: ['id','last_name','first_name'],
                            raw: true
                        })
                    }
                    else if(sender_info.role == 'STUDENT'){
                        user_info = await models.StudentInfo.findOne({
                            where: {user: note_one_new.real_sender},
                            attributes: ['id','last_name','first_name'],
                            raw: true
                        })
                    }
                    note_one_new['last_name'] = user_info.last_name
                    note_one_new['first_name'] = user_info.first_name
                    note_one_new['dojang_name'] = dojang_info.name
                }
                return res.send(note_info)
            }
            if(auth_role == 'SABUM'){
                
                result_arr = []
                //해당 반
                let note_info = await models.Note.findAll({
                    where:{sender_type: "STUDENT", recipient_dojang: dojang_id},
                    attributes: ['id','contents','createdAt','real_sender','sender'],
                    raw:true,
                    order: [['createdAt','desc']]
                })
                //데이터 가공(댓글 createdAt 합치기)
                for(let note_one of note_info){
                    let notereply_info = await models.NoteReply.findAll({
                        where: {note: note_one.id},
                        attributes: ['createdAt'],
                        order: [['createdAt','desc']],
                        raw:true
                    })
                    
                    if(notereply_info[0]){
                        if(note_one.createdAt <= notereply_info[0].createdAt)
                        {
                            note_one.createdAt = notereply_info[0].createdAt
                        }
                    }
                }
                
                //배열 내 객체 정렬
                note_info.sort(function(a,b){
                    return b.createdAt - a.createdAt
                })
                for(let note_one_new of note_info){
                    linked_count = 0
                    result_obj = new Object
                    //각 알림장이 사범과 연관 있는지
                    is_linked = 0
                    //각 알림장의 학생 정보
                    let student_info = await models.StudentInfo.findOne({
                        where: {user: note_one_new.sender},
                        attributes: ['id'],
                        raw:true
                    })
                    //사범 정보
                    let sabum_info = await models.Sabum.findOne({
                        where: {user: auth_id},
                        attributes: ['id'],
                        raw:true
                    })

                    //학생이 다니는 반 리스트
                    let classstudent_info = await models.ClassStudent.findAll({
                        where: {student: student_info.id},
                        attributes: ['class'],
                        raw:true
                    })

                    //학생이 다니는 각 반 리스트 중
                    for(let classstudent_one of classstudent_info){
                        console.log(classstudent_one,"classstudent_one")
                        let is_sabumstudent_linked = await models.SabumClass.findOne({
                            where: {sabum: sabum_info.id, class: classstudent_one.class},
                            attributes: ['id'],
                            raw:true
                        })
                        console.log(is_sabumstudent_linked,"is_sabumstudent_linked")
                        if(is_sabumstudent_linked){
                            console.log(sabum_info.id,"sabum_info.id")
                            console.log(classstudent_one.class,"classstudent_one.class")
                            is_linked = 1
                        }
                    }

                    if(is_linked && linked_count < 5){
                        user_info = new Object
                        let sender_info = await models.UserAccount.findOne({
                            where: {id: note_one_new.real_sender},
                            attributes: ['role'],
                            raw: true
                        })
                        if(sender_info.role == 'FAMILY'){
                            user_info = await models.ParentsInfo.findOne({
                                where: {user: note_one_new.real_sender},
                                attributes: ['id','last_name','first_name'],
                                raw: true
                            })
                        }
                        else if(sender_info.role == 'STUDENT'){
                            user_info = await models.StudentInfo.findOne({
                                where: {user: note_one_new.real_sender},
                                attributes: ['id','last_name','first_name'],
                                raw: true
                            })
                        }
                        console.log(note_one_new,"note_one_new")
                        result_obj['id'] = note_one_new.id
                        result_obj['contents'] = note_one_new.contents
                        result_obj['createdAt'] = note_one_new.createdAt
                        result_obj['real_sender'] = note_one_new.real_sender
                        result_obj['last_name'] = user_info.last_name
                        result_obj['first_name'] = user_info.first_name
                        result_obj['dojang_name'] = dojang_info.name
                        result_arr.push(result_obj)

                        linked_count += 1
                    }
                }
                return res.send(result_arr)
            }
            if(auth_role == 'STUDENT'){
                result_arr = []
                //해당 반
                let note_info = await models.Note.findAll({
                    where:{sender_type: "CLASS", recipient: auth_id},
                    attributes: ['id','contents','createdAt','real_sender','sender_dojang'],
                    raw:true,
                    order: [['createdAt','desc']]
                })
                //데이터 가공(댓글 createdAt 합치기)
                for(let note_one of note_info){
                    let notereply_info = await models.NoteReply.findAll({
                        where: {note: note_one.id},
                        attributes: ['createdAt'],
                        order: [['createdAt','desc']],
                        raw:true,
                        limit: 5
                    })
                    
                    if(notereply_info[0]){
                        if(note_one.createdAt <= notereply_info[0].createdAt)
                        {
                            note_one.createdAt = notereply_info[0].createdAt
                        }
                    }
                }
                
                //배열 내 객체 정렬
                note_info.sort(function(a,b){
                    return b.createdAt - a.createdAt
                })
                for(let note_one_new of note_info){
                    result_obj = new Object
                    //각 알림장이 사범과 연관 있는지

                    user_info = new Object
                    let sender_info = await models.UserAccount.findOne({
                        where: {id: note_one_new.real_sender},
                        attributes: ['role'],
                        raw: true
                    })
                    if(sender_info.role == 'KWANJANG'){
                        user_info = await models.KwanjangInfo.findOne({
                            where: {user: note_one_new.real_sender},
                            attributes: ['id','last_name','first_name'],
                            raw: true
                        })
                    }
                    else if(sender_info.role == 'SABUM'){
                        user_info = await models.Sabum.findOne({
                            where: {user: note_one_new.real_sender},
                            attributes: ['id','last_name','first_name'],
                            raw: true
                        })
                    }
                    note_one_new['last_name'] = user_info.last_name
                    note_one_new['first_name'] = user_info.first_name
                    note_one_new['dojang_name'] = dojang_info.name
                }
                return res.send(note_info)
            }
            if(auth_role == 'FAMILY'){
                result_arr = []
                //해당 반
                let note_info = await models.Note.findAll({
                    where:{sender_type: "CLASS", recipient: student_id},
                    attributes: ['id','contents','createdAt','real_sender','sender_dojang'],
                    raw:true,
                    order: [['createdAt','desc']]
                })
                //데이터 가공(댓글 createdAt 합치기)
                for(let note_one of note_info){
                    let notereply_info = await models.NoteReply.findAll({
                        where: {note: note_one.id},
                        attributes: ['createdAt'],
                        order: [['createdAt','desc']],
                        raw:true,
                        limit: 5
                    })
                    
                    if(notereply_info[0]){
                        if(note_one.createdAt <= notereply_info[0].createdAt)
                        {
                            note_one.createdAt = notereply_info[0].createdAt
                        }
                    }
                }
                
                //배열 내 객체 정렬
                note_info.sort(function(a,b){
                    return b.createdAt - a.createdAt
                })
                for(let note_one_new of note_info){
                    result_obj = new Object
                    //각 알림장이 사범과 연관 있는지

                    user_info = new Object
                    let sender_info = await models.UserAccount.findOne({
                        where: {id: note_one_new.real_sender},
                        attributes: ['role'],
                        raw: true
                    })
                    if(sender_info.role == 'KWANJANG'){
                        user_info = await models.KwanjangInfo.findOne({
                            where: {user: note_one_new.real_sender},
                            attributes: ['id','last_name','first_name'],
                            raw: true
                        })
                    }
                    else if(sender_info.role == 'SABUM'){
                        user_info = await models.Sabum.findOne({
                            where: {user: note_one_new.real_sender},
                            attributes: ['id','last_name','first_name'],
                            raw: true
                        })
                    }
                    note_one_new['last_name'] = user_info.last_name
                    note_one_new['first_name'] = user_info.first_name
                    note_one_new['dojang_name'] = dojang_info.name
                }
                return res.send(note_info)
            }
        }
        catch(err){
            await res.status(500).send({
                message:
                    err.message || "some error occured"
            })
        }
    },

    //초대 수락 
    InviteAccept: async (req, res)=>{
        // #swagger.description = "초대 수락"
        // #swagger.tags = ["초대"]
        // #swagger.summary = "초대 수락"
        try{
            //초대장 정보를 받음
            let invite_id = req.params.invite_id

            //학부모 대상 초대인 경우 관계
            let { relation } = req.body

            const auth_id = req.id
            const auth_role = req.role
            console.log(auth_id,"auth_id")
            console.log(auth_role,"auth_role")
            //초대장 정보
            let invitation_info = await models.Invitation.findOne({
                where: {id: invite_id},
                raw: true
            })
            //유저 계정 정보
            let user_info = await models.UserAccount.findOne({
                where: {id: auth_id},
                raw:true
            })
            //접속한 사람이 관장계정인 경우
            if(auth_role == 'KWANJANG'){
                //접속한 사람이 관장 계정이나 초대장은 관장대상이 아닌경우 에러
                if(invitation_info.recipient_type != 'KWANJANG'){
                    return res.send("invitation type is not kwanjang")
                }
                //관장 계정을 통해 관장 테이블 정보를 찾고
                let kwanjang_info = await models.KwanjangInfo.findOne({
                    where: {phone_number: invitation_info.phone_number},
                    raw: true
                })
                //이미 연결되어있다면 에러
                let kwanjangdojang_info = await models.KwanjangDojang.findOne({
                    where: {
                        kwanjang: kwanjang_info.id, 
                        dojang: invitation_info.dojang
                    }
                })
                if(kwanjangdojang_info){
                    return res.send("dojang, kwanjang already linked")
                }
                //초대장 정보로부터 도장ID를 받아 관장 테이블과 링크
                await models.KwanjangDojang.create({
                    kwanjang: kwanjang_info.id, dojang: invitation_info.dojang
                })
                //유저 계정에 덮어쓰기
                await models.UserAccount.update(
                    {
                        email: kwanjang_info.email,
                        last_name: kwanjang_info.last_name,
                        first_name: kwanjang_info.first_name
                    },
                    {
                    where: {id: auth_id},
                })
                //관장 테이블에 user 연결
                await models.KwanjangInfo.update(
                    {
                        user: auth_id
                    },
                    {
                        where: {phone_number: invitation_info.phone_number},
                    }
                )
                //초대장 삭제
                await models.Invitation.destroy({
                    where: {id : invite_id}
                })
                return res.send("kwanjang success")
            }
            //접속한 사람이 사범인 경우
            else if(auth_role == 'SABUM'){
                //접속한 사람이 사범 계정이나 초대장은 사범대상이 아닌경우 에러
                if(invitation_info.recipient_type != 'SABUM'){
                    return res.send("invitation type is not sabum")
                }
                //사범 계정을 통해 사범 테이블 정보를 찾고
                let sabum_info = await models.Sabum.findOne({
                    where: {phone_number: invitation_info.phone_number},
                    raw: true
                })
                //이미 연결되어있다면 에러
                let sabumdojang_info = await models.SabumDojang.findOne({
                    where: {
                        sabum: sabum_info.id, 
                        dojang: invitation_info.dojang
                    }
                })
                if(sabumdojang_info){
                    return res.send("already linked")
                }
                //초대장 정보로 부터 도장ID를 받아 사범 테이블과 링크
                await models.SabumDojang.create({
                    sabum: sabum_info.id, dojang: invitation_info.dojang
                })
                //유저 계정에 덮어쓰기
                await models.UserAccount.update(
                    {
                        email: sabum_info.email,
                        last_name: sabum_info.last_name,
                        first_name: sabum_info.first_name
                    },
                    {
                    where: {id: auth_id},
                })
                //사범 테이블에 user 연결
                await models.Sabum.update(
                    {
                        user: auth_id
                    },
                    {
                        where: {phone_number: invitation_info.phone_number},
                    }
                )
                //초대장 삭제
                await models.Invitation.destroy({
                    where: {id : invite_id}
                })
                return res.send("sabum success")
            }
            //접속한 사람이 USER인 경우(아무것도 링크가 안된 수련생or학부모인 경우)
            else if(auth_role == 'USER'){
                console.log("@22")
                //초대장의 대상이 학생인 경우(학생한테 보낸 경우)
                if(invitation_info.recipient_type == 'USER'){
                    //이미 연결되어있다면 에러
                    let studentdojang_info = await models.StudentInfo.findOne({
                        where: {
                            id: invitation_info.student, 
                            dojang: invitation_info.dojang
                        }
                    })
                    if(studentdojang_info){
                        return res.send("already linked")
                    }
                    //초대장의 학생 ID를 통해 만들어진 학생 테이블에 도장을 링크 시킴, 
                    //수련생 테이블에 user 연결
                    await models.StudentInfo.update(
                        {
                            dojang: invitation_info.dojang,
                            user: auth_id
                        },
                        {
                            where: {id: invitation_info.student}
                        } 
                    )
                    let student_info = await models.StudentInfo.findOne({
                        where: {id: invitation_info.student},
                        raw:true
                    })
                    //유저 계정에 덮어쓰기
                    await models.UserAccount.update(
                        {
                            email: student_info.email,
                            last_name: student_info.last_name,
                            first_name: student_info.first_name
                        },
                        {
                        where: {id: auth_id},
                    })
                    //유저 계정의 role을 STUDENT로 변경
                    await models.UserAccount.update({
                        role: 'STUDENT'
                    },{
                        where: {id:auth_id}
                    })
                    //초대장 삭제
                    await models.Invitation.destroy({
                        where: {id : invite_id}
                    })
                }
                //초대장의 대상이 학부모인 경우
                else if(invitation_info.recipient_type == 'FAMILY'){
                    //UserAccount에 있는 정보를 parentsInfo로 복사
                    //신규 학부모 테이블에 user 연결
                    let parents_new = await models.ParentsInfo.create({
                        user: auth_id, phone_number: user_info.phone_number, 
                        last_name: user_info.last_name, first_name: user_info.first_name,
                        email: user_info.email
                    })
                    await models.ParentsStudents.create({
                        parents: parents_new.id, student: invitation_info.student, relation: relation
                    })
                    //유저 계정의 role을 FAMILY로 변경
                    await models.UserAccount.update({
                        role: 'FAMILY'
                    },{
                        where: {id:auth_id}
                    })
                    //초대장 삭제
                await models.Invitation.destroy({
                    where: {id : invite_id}
                })
                }
                return res.send("user success")
            }
            else if(auth_role == 'FAMILY'){
                //접속한 사람이 사범 계정이나 초대장은 사범대상이 아닌경우 에러
                if(invitation_info.recipient_type != 'FAMILY'){
                    return res.send("invitation type is not family")
                }
                //기존에 있던 학부모 테이블 정보 조회
                let parents_info = await models.ParentsInfo.findOne({
                    where: {user: auth_id},
                    attributes: ['id'],
                    raw:true
                })
                //이미 연결되어있다면 에러
                let parentsstudent_info = await models.ParentsStudents.findOne({
                    where: {
                        parents: parents_info.id, 
                        student: invitation_info.student
                    }
                })
                if(parentsstudent_info){
                    return res.send("already linked")
                }
                await models.ParentsStudents.create({
                    parents: parents_info.id, student: invitation_info.student, relation: relation
                })
                //초대장 삭제
                await models.Invitation.destroy({
                    where: {id : invite_id}
                })
                return res.send("family success")
            }
            res.send("failed")
        }
        catch(err){
            await res.status(500).send({
                message:
                    err.message || "some error occured"
            })
        }
    },

    //초대 거절
    InviteRefuse: async (req, res)=>{
        // #swagger.description = "초대 받은 사람이 초대 거절"
        // #swagger.tags = ["초대"]
        // #swagger.summary = "초대 거절"
        try{
            const invite_id = req.params.invite_id
            const auth_id = req.id
            let is_invitation = await models.Invitation.findOne({
                where: {id:invite_id},
                raw:true
            })
            let user_info = await models.UserAccount.findOne({
                where: {id: auth_id},
                raw:true
            })
            if(is_invitation){
                if(is_invitation.phone_number != user_info.phone_number){
                    return res.send("you are not invited user")
                }
                await models.Invitation.update(
                    {
                        is_refused: 1
                    },
                    {
                        where: {id:invite_id}
                    }
                )
                return res.send("successfully refused")
            }
            else{return res.send("data not exist")}
        }
        catch(err){
            await res.status(500).send({
                message:
                    err.message || "some error occured"
            })
        }
    },

    //초대장 삭제
    InviteDelete: async (req, res)=>{
        // #swagger.description = "관장이 초대장 삭제"
        // #swagger.tags = ["초대"]
        // #swagger.summary = "초대장 삭제"
        try{
            const auth_id = req.id
            const auth_role = req.role
            const invite_id = req.params.invite_id
            const dojang_id = req.params.dojang_id
            let is_kwanjang = 0
            let is_invitation = await models.Invitation.findOne({
                where: {id:invite_id}
            })
            if(is_invitation){
                if(auth_role != "KWANJANG"){
                    return res.send("you are not kwanjang")
                }
                let kwanjangdojang_info = await models.KwanjangDojang.findAll({
                    where: {dojang: dojang_id},
                    attributes: ['kwanjang'],
                    raw:true
                })
                for(let kwanjangdojang_one of kwanjangdojang_info){
                    let kwanjang_info = await models.KwanjangInfo.findOne({
                        where: {id: kwanjangdojang_one.kwanjang, user: auth_id},
                        raw:true
                    })
                    if(kwanjang_info){
                        is_kwanjang = 1
                    }
                }
                if(is_kwanjang != 1){
                    return res.send("you are not kwanjang of inserted dojang_id")
                }
                await models.Invitation.destroy({
                    where: {id:invite_id}
                })
                return res.send("successfully deleted")
            }
            else{return res.send("data not exist")}
            
        }
        catch(err){
            await res.status(500).send({
                message:
                    err.message || "some error occured"
            })
        }
    },

    DisturbSetting: async (req, res) => {
        // #swagger.description = "방해금지 모드를 설정합니다."
        // #swagger.tags = ["유저"]
        // #swagger.summary = "방해금지 모드"
        try{
            const user_id = req.params.user_id;
            const { is_disturb, is_timesetting, disturb_start, disturb_end } = req.body;
            await models.UserAccount.update(
                {
                    is_disturb, is_timesetting, disturb_start, disturb_end
                },
                {
                    where : {id: user_id}
                }
            )
            
            res.send("Disturb setting Successfully updated")
        }
        catch(err){
            res.status(500).send({
                message:
                    err.message || "some error occured"
            })
        }
    },

    Secession: async (req, res) => {
        // #swagger.description = "유저 탈퇴"
        // #swagger.tags = ["유저"]
        // #swagger.summary = "탈퇴"
        try{
            const auth_id = req.id
            const auth_role = req.role
            if(auth_role == "KWANJANG"){
                let kwanjang_info = await models.KwanjangInfo.findOne({
                    where: {user: auth_id},
                    attributes: ['id'],
                    raw:true
                })
                if(kwanjang_info){
                    let kwanjang_id = kwanjang_info.id
                    let kwanjangdojang_info = await models.KwanjangDojang.findOne({
                        where: {kwanjang: kwanjang_id},
                        raw:true
                    })
                    if(kwanjangdojang_info){
                        return res.send("Dojang discharge first")
                    }
                    await models.KwanjangInfo.update(
                        {
                            user: null
                        },
                        {
                            where: {user: auth_id}
                        }
                    )
                    await models.UserAccount.destroy({
                        where: {id: auth_id}
                    })
                }
                else{
                    await models.UserAccount.destroy({
                        where: {id: auth_id}
                    })
                }
            }
            else if(auth_role == "SABUM"){
                let sabum_info = await models.Sabum.findOne({
                    where: {user: auth_id},
                    attributes: ['id'],
                    raw:true
                })
                if(sabum_info){
                    let sabum_id = sabum_info.id
                    let sabumdojang_info = await models.SabumDojang.findOne({
                        where: {sabum: sabum_id},
                        raw:true
                    })
                    if(sabumdojang_info){
                        return res.send("Dojang discharge first")
                    }
                    await models.Sabum.update(
                        {
                            user: null
                        },
                        {
                            where: {user: auth_id}
                        }
                    )
                    await models.UserAccount.destroy({
                        where: {id: auth_id}
                    })
                }
                else{
                    await models.UserAccount.destroy({
                        where: {id: auth_id}
                    })
                }
            }
            else if(auth_role == "STUDENT"){
                await models.StudentInfo.update(
                    {
                        user: null
                    },
                    {
                        where: {user: auth_id}
                    }
                )
                await models.UserAccount.destroy({
                    where: {id: auth_id}
                })
            }
            else if(auth_role == "FAMILY"){
                await models.ParentsInfo.update(
                    {
                        user: null
                    },
                    {
                        where: {user: auth_id}
                    }
                )
                await models.UserAccount.destroy({
                    where: {id: auth_id}
                })
            } 
            else if(auth_role == "USER"){
                await models.UserAccount.destroy({
                    where: {id: auth_id}
                })
            } 
            res.send("Secession success")
        }
        catch(err){
            res.status(500).send({
                message:
                    err.message || "some error occured"
            })
        }
    },
}
