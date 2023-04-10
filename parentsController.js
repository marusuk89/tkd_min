const models = require("../models");
const { sign, refresh } = require('../util/jwt-util');
const bcrypt = require("bcrypt")
const authJwt = require('../util/authJWT');
const { sequelize } = require('../models')
const Sequelize = require('sequelize');
const Op = Sequelize.Op;

const crypto = require("crypto");
const generateFileName = (bytes = 8) =>
    crypto.randomBytes(bytes).toString("hex");
const { uploadFile, getObjectSignedUrl, deleteFile } = require("../util/s3.js");

const jwt = require('jsonwebtoken');
const { TableHints } = require("sequelize");
const swaggerAutogen = require("swagger-autogen");
const registerKwanJang = require("../controller/kwanjangController");
const db = require("../models");
const note = require("../models/note");
const secret = "Hello";

const DEFAULT_PROFILE_URL = "student/default_profile.jpg"

module.exports = {
    //parents
    ParentsCreate: async (req, res, next) => {       
        // #swagger.description = "학부모을 만듭니다."
        // #swagger.tags = ["학부모"]
        // #swagger.summary = "학부모 생성"
        const { first_name, last_name, phone_number, email, sex, country, dob, ssn, photo_url, language, user } =req.body;
        await models.ParentsInfo.create({ first_name, last_name, phone_number, email, sex, country, dob, ssn, photo_url, language, user })
        res.send("Parents Successfully created")
    },

    ParentsRead: async (req, res, next) => {
        // #swagger.description = "학부모을 조회합니다. id가 0이면 모두 검색, 0이 아닐 시 해당 id만 검색합니다."
        // #swagger.tags = ["학부모"]
        // #swagger.summary = "학부모 조회"
        /* #swagger.parameters['page'] = {
            in: "query",
            description: "페이지",
            type: "integer"
        }
        */
        parents_id = req.params.parents_id;
        let pageNum = req.query.page; // 요청 페이지 넘버
        let offset = 0;
        if(pageNum > 1){
            offset = 7 * (pageNum - 1);
        }
        if (parents_id!=0) { // id 0이 아닐 때 하나 찾기
            models.ParentsInfo.findAll({
                where: {
                    user: parents_id   
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
            })}
            else { // id == 0 이면 모두 찾기
                models.ParentsInfo.findAll({
                    offset: offset,
                    limit: 7,
                }).then(data => {
                    res.send(data);
                })
                .catch(err => {
                    res.status(500).send({
                        message:
                            err.message || "some error occured"
                    })
                })
            }
    },

    ParentsReadApp: async (req, res, next) => {
        // #swagger.description = "학부모을 조회합니다. id가 0이면 모두 검색, 0이 아닐 시 해당 id만 검색합니다."
        // #swagger.tags = ["학부모"]
        // #swagger.summary = "학부모 조회"
        /* #swagger.parameters['page'] = {
            in: "query",
            description: "페이지",
            type: "integer"
        }
        */
        try{
            const parents_id = req.id;
            let parents_info = await models.ParentsInfo.findOne({
                where: {user: parents_id},
                attributes: ['id','first_name','last_name','email','phone_number'],
                raw: true
            })
            console.log(parents_info,"parents_info")
            let student_id = await models.ParentsStudents.findAll({
                where: {parents: parents_info.id},
                attributes: ['student'],
                raw: true
            })
            console.log(student_id,"student_id")
            
            parents_result = []
            for(let el of student_id){
                console.log(el,"el")
                parents_obj = new Object
                let student_account = await models.StudentInfo.findOne({
                    where: {id: el.student},
                    attributes: ['user'],
                    raw: true
                })
                console.log(student_account,"student_account")
                let is_newnote = await models.Note.findAll({
                    where: {is_read: 0, recipient: student_account.user},
                    raw: true
                })
                console.log(is_newnote,"is_newnote")
                if(is_newnote[0]){
                    parents_obj["is_newnote"] = 1
                }
                else{
                    parents_obj["is_newnote"] = 0
                }
                let student_info = await models.StudentInfo.findOne({
                    where: {id: el.student},
                    raw: true
                })
                let levelup_info = await models.LevelUpInfo.findAll({
                    where: {student: student_info.id},
                    attributes: ['levelup_date'],
                    raw:true,
                    order: [['levelup_date','desc']]
                })
                console.log(levelup_info,"levelup_info")
                if(levelup_info.length>0){
                    student_info['levelup_date']= levelup_info[0].levelup_date
                }
                else{
                    student_info['levelup_date'] = ""}

                let level = new Object
                let level_info = await models.LevelInfo.findOne({
                    where: {dojang_fk_id: student_info.dojang, level_name: student_info.level},
                    raw:true
                })
                if(level_info){
                    level = level_info
                }
                student_info['belt']= level.belt_name
                student_info['belt_img_url']= level.belt_img_url
                
                console.log(student_info,"student_info")
                let user_info = await models.UserAccount.findOne({
                    where: {id: student_info.user},
                    attributes: ['id'],
                    raw: true
                })
                let class_id = await models.ClassStudent.findOne({
                    where: {student: el.student},
                    attributes: ['class'],
                    raw: true
                })
                console.log(class_id,"class_id")
                let class_info = {}
                if(class_id){
                    class_info = await models.Class.findOne({
                        where: {id: class_id.class},
                        attributes: ['id','title','dojang'],
                        raw: true
                    })
                }
                console.log(class_info,"class_info")
                parents_obj["student_user_id"] = user_info.id
                parents_obj["my_info"] = parents_info
                parents_obj["class_info"] = class_info
                parents_obj["student_info"] = student_info

                parents_result.push(parents_obj)
            }
            
            // console.log(student_id,"parents_info")
            res.send(parents_result)
        }
        catch(err){
            await res.status(500).send({
                message:
                    err.message || "some error occured"
            })
        }
    },

    ParentsUpdate: async (req,res) => {
        /* #swagger.description = "학부모를 수정합니다.<br />
        user 는 수정이 없다면 안보내시면 되고 존재하는 ID로 입력하면 수정되며, null로 변경을 하시려면 -1을 입력 하면 됩니다"
        */
        // #swagger.tags = ["학부모"]
        // #swagger.summary = "학부모 수정"
        try{
            const { first_name, last_name, phone_number, email, sex, country, 
                dob, ssn, photo_url, language, user } = req.body
            const parents_id = req.params.parents_id;
            if (!await models.ParentsInfo.findOne({
                where : {id : parents_id}
            })){return res.send("parents not exist")}
            if(user == -1){
                await models.ParentsInfo.update(
                    { 
                        user: null
                    },
                    {
                        where : { id: parents_id }
                    }
                )
            }
            else{
                await models.ParentsInfo.update(
                    { 
                        user
                    },
                    {
                        where : { id: parents_id }
                    }
                )
            }
            await models.ParentsInfo.update(
            { 
                first_name, last_name, phone_number, email, sex, country, 
                dob, ssn, photo_url, language
            },
            {
                where : { id: parents_id }
            } 
            )
            let parents_info = await models.ParentsInfo.findOne({
                where: {id: parents_id},
                attributes: ['user'],
                raw:true
            })
            if(parents_info.user){
                await models.UserAccount.update(
                    {
                        email, phone_number, first_name, last_name
                    },
                    {
                        where: {id : parents_info.user}
                    } 
                )
            }
            res.send("ParentsInfo successfully updated")
        }
        catch(err){
            await res.status(500).send({
                message:
                    err.message || "some error occured"
            })
        }
    },

    ParentsDelete: async (req,res) => {
        // #swagger.description = "학부모를 지웁니다."
        // #swagger.tags = ["학부모"]
        // #swagger.summary = "학부모 삭제"
        try{
            const parents_id = req.params.parents_id;
            await models.ParentsInfo.destroy(
                {
                    where : { id: parents_id }
                } 
            )
            res.send("ParentsInfo successfully deleted")
        }
        catch(err){
            await res.status(500).send({
                message:
                    err.message || "some error occured"
            })
        }
    },

    NoteCreate: async (req,res,next) => {
        /* #swagger.description = "알림장을 만듭니다. <br />
        student_id는 학생의 계정 ID입니다 <br />
        recipient_arr는 보내는 사람이 <br /> 
        관장/사범일 경우 받는 학생의 계정 ID 입력 ex : [23,24,27] <br /> 
        학부모/학생일 경우 받는 도장의 ID 입력 ex : [1]
        "
        */
        // #swagger.tags = ["알림장"]
        // #swagger.summary = "알림장 생성"
        
        try{
            let FILE = req.files;
            let photo_url = []
            let user_id = []

            let auth_id = req.id
            let auth_role = req.role
            const { contents, recipient_arr } = req.body;
            let student_id = req.params.student_id
            let dojang_id = req.params.dojang_id

            console.log(FILE,"FILE")

            if(!recipient_arr){
                return res.send("recipient_arr is not inserted")
            }
            if(!contents){
                return res.send("contents is not inserted")
            }
            if(FILE){
                for ( var i = 0; i < FILE.length; i++){
                    if(FILE[i].mimetype.split('/')[0]=="image"){
                        let imageName = generateFileName();
                        if(await models.UrlGroup.findOne({
                            where: {urls:"note/img/"+imageName}
                        })){imageName = generateFileName();}
                        imageName = "note/img/"+imageName
                        await models.UrlGroup.create({urls:imageName}) //url group에 늘리기
                        await uploadFile(FILE[i].buffer, imageName, FILE[i].mimetype)
                        console.log(imageName,"imageName")
                        photo_url.push(imageName)
                    }
                }
            }
            if(photo_url.length == 0){
                photo_url = null
            }
            if(photo_url){
                photo_url = JSON.stringify(photo_url)
            }
            
            new_recipient_arr= JSON.parse(recipient_arr)
            arr_len = new_recipient_arr.length;

            //학부모가 보낸경우
            if(auth_role == 'FAMILY' && student_id !=0 ){
                parents_info = await models.ParentsInfo.findOne({
                    where: {user: auth_id},
                    attributes:['id'],
                    raw: true
                })
                console.log(parents_info,"parents_info")
                parentsStudents_info = await models.ParentsStudents.findAll({
                    where: {parents: parents_info.id},
                    attributes: ['student'],
                    raw:true
                }) 
                //입력된 student_id가 실제로 접속된 부모의 자식인지 체크
                let check = "false"
                for(let el of parentsStudents_info){
                    console.log(el,"el")
                    let student_account = await models.StudentInfo.findOne({
                        where: {id: el.student},
                        attributes: ['user'],
                        raw: true
                    })
                    if(student_account.user == student_id){
                        console.log("@@@@")
                        check = "ok"
                    }
                }
                if(check == "false"){
                    return res.send("Inserted student info is not associated with parents")
                }

                for(i=0;i<arr_len;i++){
                    await models.Note.create({ sender: student_id, recipient_dojang:new_recipient_arr[i], 
                        real_sender: req.id, contents, sender_type: "STUDENT",
                        photo_url : photo_url, is_read : 0
                    })
                    //관장 알림 대상
                    let kwanjangdojang_info = await models.KwanjangDojang.findAll({
                        where: {dojang: new_recipient_arr[i]},
                        attributes: ['kwanjang'],
                        raw:true
                    })
                    for(let kwanjangdojang_one of kwanjangdojang_info){
                        let kwanjang_info = await models.KwanjangInfo.findOne({
                            where:{id:kwanjangdojang_one.kwanjang},
                            attributes: ['user'],
                            raw:true
                        })
                        user_id.push(kwanjang_info.user)
                    }
                    //사범 알림 대상
                    let classstudent_info = await models.ClassStudent.findAll({
                        where: {student: student_id},
                        attributes: ['class'],
                        raw:true,
                    })
                    for(let classstudent_one of classstudent_info){
                        let sabumclass_info = await models.SabumClass.findAll({
                            where: {class: classstudent_one.class},
                            attributes: ['sabum'],
                            raw:true
                        })
                        for(let sabumclass_one of sabumclass_info){
                            let sabum_info = await models.Sabum.findOne({
                                where: {id: sabumclass_one.sabum},
                                attributes: ['user'],
                                raw:true
                            })
                            user_id.push(sabum_info.user)
                        }
                    }
                }
            }
            //학부모가 보낸경우이나 student_id를 0으로 보낸경우
            else if (auth_role == 'FAMILY' && student_id == 0 ){
                return res.send("parents must insert student_id, not 0")
            }
            //학생이 보낸 경우
            else if (auth_role == 'STUDENT'){
                for(i=0;i<arr_len;i++){
                    await models.Note.create({ sender: req.id, recipient_dojang:new_recipient_arr[i], 
                        real_sender: req.id, contents, sender_type: "STUDENT",
                        photo_url : photo_url, is_read : 0
                    })
                    let kwanjangdojang_info = await models.KwanjangDojang.findAll({
                        where: {dojang: new_recipient_arr[i]},
                        attributes: ['kwanjang'],
                        raw:true
                    })
                    for(let kwanjangdojang_one of kwanjangdojang_info){
                        let kwanjang_info = await models.KwanjangInfo.findOne({
                            where:{id:kwanjangdojang_one.kwanjang},
                            attributes: ['user'],
                            raw:true
                        })
                        user_id.push(kwanjang_info.user)
                    }
                }
            }
            //관장이 보낸 경우
            //관장이 여러 도장이랑 연결되어있는 경우 특정 dojang_id가 필요한가??
            //student_id를 받은것 처럼 dojang_id도 받으면 되긴함
            else if(auth_role == 'KWANJANG'){
                for(i=0;i<arr_len;i++){
                    kwanjang_info = await models.KwanjangInfo.findOne({
                        where: {user: req.id},
                        attributes: ['id'],
                        raw:true
                    })
                    await models.Note.create({ sender_dojang: dojang_id, 
                        recipient:new_recipient_arr[i], 
                        real_sender: req.id, contents, sender_type: "CLASS",
                        photo_url : photo_url, is_read : 0})
                }}
            //사범이 보낸 경우
            else if(auth_role == 'SABUM'){
                for(i=0;i<arr_len;i++){
                    sabum_info = await models.Sabum.findOne({
                        where: {user: req.id},
                        attributes: ['id'],
                        raw:true
                    })
                    await models.Note.create({ sender_dojang: dojang_id, 
                        recipient:new_recipient_arr[i], 
                        real_sender: req.id, contents, sender_type: "CLASS",
                        photo_url : photo_url, is_read : 0})
                }}
            else { return res.send(auth_role)}
            res.send("Note Successfully created")
        }
        catch(err){
            await res.status(500).send({
                message:
                    err.message || "some error occured"
            })
        }
    },

    NoteReadByMonth: async (req,res) => {
        /* #swagger.description = "알림장을 조회합니다. <br /><br />
        ***Meaning***<br /><br />
        from_who : 누가 보냈나(학생 / 관장 / 사범)
        sender : 보낸 사람 계정 ID
        sender_dojang : 보낸 도장 ID
        recipient : 받는 사람 계정 ID
        recipient_dojang : 받는 도장 ID
        real_sender : 실제 보낸 사람 계정 ID
        "
        
        */
        // #swagger.tags = ["알림장"]
        // #swagger.summary = "알림장 조회"
        try{
            const year = req.params.year;
            const month = req.params.month;
            const dojang_id = req.params.dojang_id;
            const student_user_id = req.params.student_user_id;
            let auth_id = req.id
            let auth_role = req.role
            console.log(dojang_id, "dojang_id")
            console.log(student_user_id, "student_user_id")
            
            //년월로 1차 필터
            note_infos = await models.Note.findAll({
                where: {
                    createdAt: sequelize.where(sequelize.fn('YEAR', sequelize.col('createdAt')), year),
                    [Op.and]: sequelize.where(sequelize.fn('MONTH', sequelize.col('createdAt')), month)
                },
                raw: true,
                order: [['createdAt','desc']],
            })
            //마지막으로 저장될 ARRAY
            recieve_result = []
            send_result = []
            result_obj = new Object
            result_obj['send'] = []
            result_obj['recieve'] = []

            //년월에 해당하는 알림장을 하나씩 돌면서
            console.log(auth_role,"auth_role")
            console.log(auth_id,"auth_id")
            for(let note_info of note_infos){
                let real_sender_info = await models.UserAccount.findOne({
                    where: {id: note_info.real_sender},
                    attributes: ['role','id'],
                    raw:true
                })

                let reply_info = await models.NoteReply.findAndCountAll({
                    where: {note: note_info.id},
                    attributes: ['user','contents'],
                    raw:true
                })
                note_info["reply_count"] = reply_info.count
                //받은 알림장
                //접속한 사람이 학부모 또는 학생일 경우
                if(auth_role == 'FAMILY' || auth_role == 'STUDENT'){
                    let sender_one = new Object
                    let role = ""
                    //보내는 사람 이름
                    if(real_sender_info.role == 'KWANJANG'){
                        sender_one = await models.KwanjangInfo.findOne({
                            where: {user: note_info.real_sender},
                            attributes: ['id','last_name','first_name'],
                            raw:true
                        })
                        role = "관장"
                    }
                    if(real_sender_info.role == 'SABUM'){
                        sender_one = await models.Sabum.findOne({
                            where: {user: note_info.real_sender},
                            attributes: ['id','last_name','first_name'],
                            raw:true
                        })
                        role = "사범"
                    }
                    if(note_info.recipient == student_user_id){
                        note_info['real_sender_last_name']=sender_one.last_name
                        note_info['real_sender_first_name']=sender_one.first_name
                        note_info['real_sender_role']=role
                        recieve_result.push(note_info)
                    }
                }

                //관장이 볼 경우
                else if(auth_role == 'KWANJANG'){
                    let sender_one = new Object
                    let role = ""
                    if(real_sender_info.role == 'STUDENT'){
                        sender_one = await models.StudentInfo.findOne({
                            where: {user: note_info.real_sender},
                            attributes: ['id','last_name','first_name'],
                            raw:true
                        })
                        role = "수련생"
                    }
                    if(real_sender_info.role == 'FAMILY'){
                        parents_info = await models.ParentsInfo.findOne({
                            where: {user: note_info.real_sender},
                            attributes: ['id','last_name','first_name'],
                            raw:true
                        })
                        student_info = await models.StudentInfo.findOne({
                            where: {user: note_info.sender},
                            raw:true
                        })
                        let parentsstudent_info = await models.ParentsStudents.findOne({
                            where: {parents: parents_info.id, student:student_info.id},
                            attributes: ['relation'],
                            raw:true
                        })
                        if(parentsstudent_info){role = parentsstudent_info.relation}
                    }
                    if(note_info.recipient_dojang == dojang_id){
                        //real_sender -> sender로 이름 변경
                        note_info['real_sender_last_name']=student_info.last_name
                        note_info['real_sender_first_name']=student_info.first_name
                        note_info['real_sender_role']=role
                        recieve_result.push(note_info)
                    }
                }
                //사범이 볼 경우
                else if(auth_role == 'SABUM'){
                    if(note_info.recipient_dojang == dojang_id){
                        let role = ""
                        let sender_one = new Object
                        if(real_sender_info.role == 'STUDENT'){
                            sender_one = await models.StudentInfo.findOne({
                                where: {user: note_info.real_sender},
                                attributes: ['id','last_name','first_name'],
                                raw:true
                            })
                            role = "수련생"
                        }
                        if(real_sender_info.role == 'FAMILY'){
                            sender_one = await models.ParentsInfo.findOne({
                                where: {user: note_info.real_sender},
                                attributes: ['id','last_name','first_name'],
                                raw:true
                            })
                            sender_id = await models.StudentInfo.findOne({
                                where: {user: note_info.sender},
                                raw:true
                            })
                            let parentsstudent_info = await models.ParentsStudents.findOne({
                                where: {parents: sender_one.id, student:sender_id.id},
                                attributes: ['relation'],
                                raw:true
                            })
                            if(parentsstudent_info){role = parentsstudent_info.relation}
                        }
                        //보내는 사람이 어떤반인지 필터
                        student_info = await models.StudentInfo.findOne({
                            where: {user : note_info.sender},
                            attributes: ['id'],
                            raw: true
                        })
                        student_class_info = await models.ClassStudent.findOne({
                            where: {student: student_info.id},
                            attributes: ['class'],
                            raw: true
                        })
                        if(!student_class_info){return res.send("student is not in class")}
                        sabum_info = await models.Sabum.findOne({
                            where: {user: auth_id},
                            attributes: ['id'],
                            raw:true
                        })
                        instructor_class_info = await models.InstructorClass.findAll({
                            where: {sabum: sabum_info.id},
                            attributes: ['class'],
                            raw:true
                        })
                        for(let instructor_class_one of instructor_class_info){
                            if(student_class_info.class == instructor_class_one.class){
                                note_info['real_sender_last_name']=sender_id.last_name
                                note_info['real_sender_first_name']=sender_id.first_name
                                note_info['real_sender_role']=role
                                recieve_result.push(note_info)
                            }
                        }
                    }
                }
                //보낸 알림장
                //접속한 사람이 학부모 또는 학생일 경우
                if(auth_role == 'FAMILY' || auth_role == 'STUDENT'){
                    console.log("@@@@@@")
                    let student_table_id = await models.StudentInfo.findOne({
                        where: {user: student_user_id},
                        raw:true
                    })
                    if(!student_table_id){
                        result_obj["result"] = "false"
                        return res.send(result_obj)
                    }
                    console.log(student_table_id,"student_table_id")
                    let sender_one = new Object
                    let role = ""
                    console.log(real_sender_info,"real_sender_info")
                    //보내는 사람 이름
                    if(real_sender_info.role == 'FAMILY'){
                        sender_one = await models.ParentsInfo.findOne({
                            where: {user: note_info.real_sender},
                            attributes: ['id','last_name','first_name'],
                            raw:true
                        })
                        console.log(sender_one.id,"sender_one.id")
                        let parentsstudent_info = await models.ParentsStudents.findOne({
                            where: {parents: sender_one.id, student:student_table_id.id},
                            attributes: ['relation'],
                            raw:true
                        })
                        if(parentsstudent_info){role = parentsstudent_info.relation}
                    }
                    if(real_sender_info.role == 'STUDENT'){
                        sender_one = await models.StudentInfo.findOne({
                            where: {user: note_info.real_sender},
                            attributes: ['id','last_name','first_name'],
                            raw:true
                        })
                        role = "본인"
                    }
                    console.log(note_info.sender,"note_info.sender")
                    console.log(student_user_id,"student_user_id")
                    if(note_info.sender == student_user_id){
                        //바꿔야 함!!!
                        note_info['real_sender_last_name']=student_table_id.last_name
                        note_info['real_sender_first_name']=student_table_id.first_name
                        note_info['real_sender_role']=role
                        send_result.push(note_info)
                    } 
                }
                //관장이 볼 경우
                else if(auth_role == 'KWANJANG'){
                    let sender_one = new Object
                    let role = ""
                    console.log(real_sender_info,"real_sender_info")
                    //보내는 사람 이름
                    if(real_sender_info.role == 'KWANJANG'){
                        sender_one = await models.KwanjangInfo.findOne({
                            where: {user: note_info.real_sender},
                            attributes: ['id','last_name','first_name'],
                            raw:true
                        })
                        role = "관장"
                    }
                    else if(real_sender_info.role == 'SABUM'){
                        sender_one = await models.Sabum.findOne({
                            where: {user: note_info.real_sender},
                            attributes: ['id','last_name','first_name'],
                            raw:true
                        })
                        role = "사범"
                    }
                    if(note_info.sender_dojang == dojang_id){
                        note_info['real_sender_last_name']=sender_one.last_name
                        note_info['real_sender_first_name']=sender_one.first_name
                        note_info['real_sender_role']=role
                        send_result.push(note_info)
                    }
                }
                //사범이 볼 경우
                else if(auth_role == 'SABUM'){
                    if(note_info.sender_dojang == dojang_id){
                        let sender_one = new Object
                        let role = ""
                        //보내는 사람 이름
                        if(real_sender_info.role == 'KWANJANG'){
                            sender_one = await models.KwanjangInfo.findOne({
                                where: {user: note_info.real_sender},
                                attributes: ['id','last_name','first_name'],
                                raw:true
                            })
                            role = "관장"
                        }
                        else if(real_sender_info.role == 'SABUM'){
                            sender_one = await models.Sabum.findOne({
                                where: {user: note_info.real_sender},
                                attributes: ['id','last_name','first_name'],
                                raw:true
                            })
                            role = "사범"
                        }
                        //받는 사람이 어떤반인지 필터
                        console.log(note_info.recipient,"note_info.recipient")
                        student_info = await models.StudentInfo.findOne({
                            where: {user : note_info.recipient},
                            attributes: ['id'],
                            raw: true
                        })
                        console.log(student_info,"student_info")
                        student_class_info = await models.ClassStudent.findOne({
                            where: {student: student_info.id},
                            attributes: ['class'],
                            raw: true
                        })
                        if(!student_class_info){break}
                        sabum_info = await models.Sabum.findOne({
                            where: {user: auth_id},
                            attributes: ['id'],
                            raw:true
                        })
                        instructor_class_info = await models.InstructorClass.findAll({
                            where: {sabum: sabum_info.id},
                            attributes: ['class'],
                            raw:true
                        })
                        for(let instructor_class_one of instructor_class_info){
                            if(student_class_info.class == instructor_class_one.class){
                                note_info['real_sender_last_name']=sender_one.last_name
                                note_info['real_sender_first_name']=sender_one.first_name
                                note_info['real_sender_role']=role
                                send_result.push(note_info)
                            }
                        }
                    }
                }
            }
            result_obj['send'] = send_result
            result_obj['recieve'] = recieve_result
            res.send(result_obj)
        }
        catch(err){
            res.status(500).send({
                message:
                    err.message || "some error occured"
            })
        }
    },

    NoteReadOne: async (req,res) => {
        /* #swagger.description = "알림장 하나를 조회합니다. <br /><br />
        
        */
        // #swagger.tags = ["알림장"]
        // #swagger.summary = "알림장 하나 조회"
        try{
            const note_id = req.params.note_id
            sender_role = ""
            receive_role = ""
            
            let note_info = await models.Note.findOne({
                where: {id: note_id},
                raw:true
            })
            let real_sender_info = await models.UserAccount.findOne({
                where: {id: note_info.real_sender},
                raw:true
            })
            console.log(note_info,"note_info")
            //받는게 학생
            if(note_info.sender_type == "CLASS"){
                let receive_info = await models.UserAccount.findOne({
                    where: {id: note_info.recipient},
                    raw:true
                })
                console.log(receive_info,"receive_info")
                if(receive_info.role == "FAMILY"){
                    let parents_info = await models.ParentsInfo.findOne({
                        where: {user : real_sender_info.id},
                        raw:true
                    })
                    let parentsstudents_info = await models.ParentsStudents.findOne({
                        where: {parents : parents_info.id},
                        attributes: ['relation'],
                        raw:true
                    })
                    receive_role = parentsstudents_info.relation
                }
                else if(receive_info.role == "STUDENT"){
                    receive_role = "수련생"
                }
                note_info['recieve_name'] = receive_info.last_name+receive_info.first_name
            
            }
            //받는게 도장
            else if(note_info.sender_type == "STUDENT"){
                let dojang_info = await models.Dojang.findOne({
                    where : {id: note_info.recipient_dojang},
                    raw:true
                })
                note_info['dojang_logo'] = dojang_info.logo_img
                note_info['recieve_name'] = dojang_info.name
                receive_role = "도장"
            }
            if(real_sender_info.role == "FAMILY"){
                let parents_info = await models.ParentsInfo.findOne({
                    where: {user : real_sender_info.id},
                    raw:true
                })
                let parentsstudents_info = await models.ParentsStudents.findOne({
                    where: {parents : parents_info.id},
                    attributes: ['relation'],
                    raw:true
                })
                sender_role = parentsstudents_info.relation
            }
            else if(real_sender_info.role == "KWANJANG"){
                sender_role = "관장"
            }
            else if(real_sender_info.role == "SABUM"){
                sender_role = "사범"
            }
            else if(real_sender_info.role == "STUDENT"){
                sender_role = "수련생"
            }
            if(!note_info){
                return res.send("note not exist")
            }
            note_info['sender_role'] = sender_role
            note_info['sender_name'] = real_sender_info.last_name+real_sender_info.first_name
            note_info['receive_role'] = receive_role
            let note_reply_info = await models.NoteReply.findAll({
                where: {note: note_id},
                raw:true
            })
            for(let note_reply_one of note_reply_info){
                let useraccount_info = await models.UserAccount.findOne({
                    where: {id:note_reply_one.user},
                    attributes: ['id','role'],
                    raw:true
                })
                if(useraccount_info.role == 'KWANJANG'){
                    let kwanjang_info = await models.KwanjangInfo.findOne({
                        where: {user: useraccount_info.id},
                        raw:true
                    })
                    note_reply_one['last_name'] = kwanjang_info.last_name
                    note_reply_one['first_name'] = kwanjang_info.first_name
                    note_reply_one['role'] = "관장"
                }
                else if(useraccount_info.role == 'SABUM'){
                    let sabum_info = await models.Sabum.findOne({
                        where: {user: useraccount_info.id},
                        raw:true
                    })
                    note_reply_one['last_name'] = sabum_info.last_name
                    note_reply_one['first_name'] = sabum_info.first_name
                    note_reply_one['role'] = "사범"
                }
                else if(useraccount_info.role == 'STUDENT'){
                    let student_info = await models.StudentInfo.findOne({
                        where: {user: useraccount_info.id},
                        raw:true
                    })
                    note_reply_one['last_name'] = student_info.last_name
                    note_reply_one['first_name'] = student_info.first_name
                    note_reply_one['role'] = "수련생"
                }
                else if(useraccount_info.role == 'FAMILY'){
                    let student_one
                    if(note_info.sender_type == "STUDENT"){
                        let student_info = await models.StudentInfo.findOne({
                            where: {user: note_info.sender},
                            attributes: ['id','last_name','first_name'],
                            raw:true
                        })
                        student_one = student_info
                    }
                    else if(note_info.sender_type == "CLASS"){
                        let student_info = await models.StudentInfo.findOne({
                            where: {user: note_info.recipient},
                            attributes: ['id','last_name','first_name'],
                            raw:true
                        })
                        student_one = student_info
                    }
                    let parents_info = await models.ParentsInfo.findOne({
                        where: {user: useraccount_info.id},
                        raw:true
                    })
                    let parentsstudents_info = await models.ParentsStudents.findOne({
                        where: {student : student_one.id, parents:parents_info.id},
                        attributes: ['relation'],
                        raw:true
                    })
                    note_reply_one['last_name'] = student_one.last_name
                    note_reply_one['first_name'] = student_one.first_name
                    note_reply_one['role'] = parentsstudents_info.relation
                }
            }
            
            if(note_reply_info){
                note_info['reply_info'] = note_reply_info
            }
            res.send(note_info)
        }
        catch(err){
            res.status(500).send({
                message:
                    err.message || "some error occured"
            })
        }
    },

    NoteInfoByDojang: async (req,res) => {
        /* #swagger.description = "알림장 관련 정보를 조회합니다. <br /><br />
        
        */
        // #swagger.tags = ["알림장"]
        // #swagger.summary = "알림장 관련 정보 조회"
        try{
            const dojang_id = req.params.dojang_id
            let result_arr = []

            let class_info = await models.Class.findAll({
                where: {dojang: dojang_id},
                attributes: ['id','title'],
                raw:true
            })
            let class_obj = new Object
            for(let class_one of class_info){
                console.log(class_one,"class_one")
                let class_arr = []
                let classstudent_info = await models.ClassStudent.findAll({
                    where: {class: class_one.id},
                    attributes:['student'],
                    raw:true
                })
                for(let classstudent_one of classstudent_info){
                    let student_info = await models.StudentInfo.findOne({
                        where: {id: classstudent_one.student},
                        attributes: ['user','first_name','last_name'],
                        raw:true
                    })
                    student_info['name'] = student_info.last_name + student_info.first_name
                    class_arr.push(student_info)
                }
                class_obj[`${class_one.title}`] = class_arr
            }
            return res.send(class_obj)
        }
        catch(err){
            res.status(500).send({
                message:
                    err.message || "some error occured"
            })
        }
    },

    NoteUpdate: async (req,res,next) => {
        /* #swagger.description = "알림장 정보를 수정합니다 
        "
        */
        // #swagger.tags = ["알림장"]
        // #swagger.summary = "알림장 수정"
        
        try{
            const note_id = req.params.note_id
            let { contents, delImgname, is_read } = req.body;

            let note_info = await models.Note.findOne({
                where : {id : note_id},
                attributes: ['real_sender']
            })
            if(!note_info){return res.send("note_id not exist")}
            if(note_info.real_sender != req.id){
                return res.send("you don't have permission for updating")
            }
            let FILE = req.files;
            let photo_url = []

            //기존 파일들 뽑아냄
            defaultPhoto = await models.Note.findOne({
                where: {id:note_id},
                attributes: ['photo_url'],
                raw: true
            })
            console.log(defaultPhoto,"defaultPhoto")
            
            //img
            //해당 키의 파일이 있을때만 실행
            if(FILE){
                //원래 파일이 있으면 지우고 원래 파일 가공
                if(defaultPhoto.photo_url){
                    default_img = JSON.parse(defaultPhoto.photo_url)
                    if(delImgname){
                        delImgname= JSON.parse(delImgname)
                        for(let del of delImgname){
                            for(let i=0; i< default_img.length; i++){
                                if(del == default_img[i]){
                                    await deleteFile(default_img[i]),
                                    await models.UrlGroup.destroy({ //url group에서 삭제하기
                                        where: {urls: default_img[i]}
                                    })
                                    default_img.splice(i, 1); 
                                    i--; 
                                }
                            }
                        }
                    }
                    photo_url = default_img
                }
                //원래 파일이 없다면 빈 배열 부여
                if(!photo_url){
                    photo_url = []
                }
                //받은 파일이 있으니 파일 생성
                for ( var i = 0; i < FILE.length; i++){
                    let imageName = generateFileName();
                    if(FILE[i].mimetype.split('/')[0]=="image"){
                        if(await models.UrlGroup.findOne({
                            where: {urls:"note/img/"+imageName}
                        })){imageName = generateFileName();}
                        imageName = "note/img/"+imageName
                        await models.UrlGroup.create({urls:imageName}) //url group에 늘리기
                        await uploadFile(FILE[i].buffer, imageName, FILE[i].mimetype)
                        photo_url.push(imageName)
                    }
                }
                //저장을 위한 문자화
                photo_url = JSON.stringify(photo_url)
                //따로 따로 업데이트
                await models.Note.update(
                    {
                        photo_url
                    },
                    {
                        where: { id: note_id}
                    }
                )
            }
            await models.Note.update(
                {
                    contents, is_read
                },
                {
                    where: { id: note_id}
                }
            ),
            res.send("Note successfully updated")
        }
        catch(err){
            await res.status(500).send({
                message:
                    err.message || "some error occured"
            })
        }
    },

    NoteDelete: async (req, res, next) => {
        // #swagger.description = "알림장ID를 받아 알림장을 삭제합니다"
        // #swagger.tags = ["알림장"]
        // #swagger.summary = "알림장 삭제"
        const note_id = req.params.note_id
        try{
            await models.NoteReply.update(
                { 
                    note: null
                },
                {
                    where: {note: note_id}
                }
            )
            await models.Note.destroy({
                where: {id: note_id}
            })
            res.send("Note Successfully deleted")
        }   
        catch(err){
            res.status(500).send({
                message:
                    err.message || "some error occured"
            })
        }
    },

    NoteReplyCreate: async (req, res, next) => {
        // #swagger.description = "알림장 ID를 받아 댓글을 만듭니다"
        // #swagger.tags = ["알림장"]
        // #swagger.summary = "알림장 댓글 생성"
        
        try{
            const note_id = req.params.note_id
            const { contents } = req.body
            await models.NoteReply.create({
                note: note_id, user: req.id, contents
            })
            res.send("NoteReply Successfully created")
        }   
        catch(err){
            res.status(500).send({
                message:
                    err.message || "some error occured"
            })
        }
    },

    NoteReplyRead: async (req, res, next) => {
        // #swagger.description = "알림장 ID를 받아 댓글을 조회"
        // #swagger.tags = ["알림장"]
        // #swagger.summary = "알림장 댓글 조회"
        
        try{
            const note_id = req.params.note_id
            let reply_info = await models.NoteReply.findAll({
                where: {note: note_id},
                attributes: ['user','contents','createdAt'],
                raw:true
            })
            console.log(reply_info,"reply_info")
            let reply_arr = []
            for (let reply of reply_info){
                let reply_user = new Object
                let user_info = await models.UserAccount.findOne({
                    where: {id: reply.user},
                    attributes: ['username','role']
                })
                if(user_info.role == 'KWANJANG'){
                    let kwanjang_info = await models.KwanjangInfo.findOne({
                        where: {user: reply.user},
                        attributes: ['id','last_name','first_name'],
                        raw: true
                    })
                    reply["relation"]= "관장"
                    reply_user = kwanjang_info
                }
                else if(user_info.role == 'SABUM'){
                    let sabum_info = await models.Sabum.findOne({
                        where: {user: reply.user},
                        attributes: ['id','last_name','first_name'],
                        raw: true
                    })
                    reply["relation"]= "사범"
                    reply_user = sabum_info
                }
                else if(user_info.role == 'FAMILY'){
                    
                    let parents_info = await models.ParentsInfo.findOne({
                        where: {user: reply.user},
                        attributes: ['id','last_name','first_name','relation'],
                        raw: true
                    })
                    reply["relation"]= parents_info.relation
                    console.log(parents_info,"req.id")
                    console.log(parents_info,"parents_info")
                    reply_user = parents_info
                }
                else if(user_info.role == 'STUDENT'){
                    let student_info = await models.StudentInfo.findOne({
                        where: {user: reply.user},
                        attributes: ['id','last_name','first_name'],
                        raw: true
                    })
                    reply["relation"]= "수련생"
                    reply_user = student_info
                }
                console.log(reply,"reply")
                console.log(reply_user,"reply_user")
                reply["user"] = reply_user
                reply_arr.push(reply)
                
            }
            res.send(reply_arr)
        }   
        catch(err){
            res.status(500).send({
                message:
                    err.message || "some error occured"
            })
        }
    },

    NoteReplyDelete: async (req, res, next) => {
        // #swagger.description = "알림장 ID를 받아 댓글을 삭제"
        // #swagger.tags = ["알림장"]
        // #swagger.summary = "알림장 댓글 삭제"
        
        try{
            const note_reply_id = req.params.note_reply_id

            let note_reply_info = await models.NoteReply.findOne({
                where: {id: note_reply_id},
                raw:true
            })
            if(!note_reply_info){
                return res.send("note not exist")
            }
            await models.NoteReply.update(
                {
                    note: null
                },
                {
                    where: {id: note_reply_id},
                }
            )
            res.send("note successfully deleted")
        }   
        catch(err){
            res.status(500).send({
                message:
                    err.message || "some error occured"
            })
        }
    },
}
