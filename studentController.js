const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const { sequelize } = require('../models')
const models = require("../models");

const {fnImgUpload} = require("../controller/utilController")
const crypto = require("crypto");
const sharp = require("sharp");
const generateFileName = (bytes = 8) =>
    crypto.randomBytes(bytes).toString("hex");
const { uploadFile, getObjectSignedUrl, deleteFile } = require("../util/s3.js");

const { sign, refresh } = require('../util/jwt-util');
const bcrypt = require("bcrypt")
const authJwt = require('../util/authJWT');
const jwt = require('jsonwebtoken');
const { TableHints } = require("sequelize");
const swaggerAutogen = require("swagger-autogen");
const registerKwanJang = require("../controller/kwanjangController");
const { truncate } = require('fs');
const secret = "Hello";

const DEFAULT_PROFILE_URL = "student/default_profile.jpg"

// /* #swagger.parameters['obj'] = { 
//             in: 'body',
//             schema: { $ref: "#/definitions/student_create" }
//         } */

module.exports = {
    //students
    StudentCreate: async (req,res,next) => {
        /* #swagger.description = "원생을 만듭니다. <br />
        unique_id need [first(last)_name, phone_number, user, dojang] <br />
        user, dojang necessary INTEGER" <br /> 
        반연결을 하지 않는 경우 class_id를 0으로 입력 <br />
        이미지 파일은 img, 비디오는 vid, 문서는 doc
        */
        // #swagger.tags = ["원생"]
        // #swagger.summary = "원생 생성"
        
        try{
            class_id = req.params.class_id
            let FILE = req.file;
            let photo_url = []
            let imageName = generateFileName();
            
            if(FILE){
                if(FILE.mimetype.split('/')[0]=="image"){
                    if(await models.UrlGroup.findOne({
                        where: {urls:"student/img/"+imageName}
                    })){imageName = generateFileName();}
                    imageName = "student/img/"+imageName
                    await models.UrlGroup.create({urls:imageName}) //url group에 늘리기
                    await uploadFile(FILE.buffer, imageName, FILE.mimetype)
                    photo_url.push(imageName)
                }
            }
            else{
                photo_url.push(DEFAULT_PROFILE_URL)
            }
            photo_url = JSON.stringify(photo_url).slice(2,-2)
            
            const { first_name, last_name, phone_number, user, dojang, weight, 
                address_name, road_address, region_1depth_name, region_2depth_name, 
                region_3depth_name, address_detail, dojang_reg_date,
                height, sex, country, level, level_number, ssn, poomsae, 
                language, is_apporved, email, school, Rep_name, Rep_phone_number, 
                Rep_rel, career, jump_level, jump_career, memo, due_date, 
                depositor_name, payment_method, payment_note, paying_amount, balance, dob, } =req.body;
            let unique_id = "KO"
            unique_id = unique_id + Math.random().toString(36).slice(2)

            student = await models.StudentInfo.create({ first_name, last_name, 
                address_name, road_address, region_1depth_name, region_2depth_name, 
                region_3depth_name, address_detail, user, dojang_reg_date,
                phone_number, dojang, weight, height, sex, country, level, 
                level_number, ssn, photo_url: photo_url, poomsae, language, 
                is_apporved, email, school, Rep_name, Rep_phone_number, Rep_rel, 
                career, jump_level, jump_career, memo, due_date, depositor_name, 
                payment_method, payment_note, paying_amount, balance, dob,unique_id: unique_id })
            console.log(student.id,"student")
            if(class_id != 0){
                await models.ClassStudent.create({ class:class_id, student: student.id })
            }
            res.send("Student Successfully created")
            
        }
        catch(err){
            res.status(500).send({
                message:
                    err.message || "some error occured"
        })}
    },

    StudentCreateByTitle: async (req,res,next) => {
        // #swagger.description = "반 이름, 원생 ID를 받아 원생 <-> 반 연결합니다."
        // #swagger.tags = ["원생"]
        // #swagger.summary = "원생 <-> 반 연결"
        const class_id = req.params.class_id;
        const student_id = req.params.student_id;
        // class_id = await models.Class.findOne({
        //     where : {title:title_name},
        // })
        try{
            if (!await models.StudentInfo.findOne({
                where : {id : student_id}
            })){return res.send("student_id not exist")}

            if (!await models.Class.findOne({
                where : {id : class_id}
            })){return res.send("class_id not exist")}

            await models.ClassStudent.destroy({
                where: {student: student_id}
            })
            await models.ClassStudent.create({
                class : class_id,
                student: student_id
            })
            
            const data = await models.InstructorClass.findAll({
                where : {class:class_id},
                attributes: {
                    include: [
                        [sequelize.fn('date_format', sequelize.col('InstructorClass.createdAt'), '%Y-%m-%d'), 'createdAt'],
                        [sequelize.fn('date_format', sequelize.col('InstructorClass.updatedAt'), '%Y-%m-%d'), 'updatedAt'],
                    ],
                }
            })
            res.send(data);
        }
        catch(err){
            res.status(500).send({
                message:
                    err.message || "some error occured"
            })
        }
    },

    StudentClassCreate: async (req, res) => {
        // #swagger.description = "원생 <-> 반 정보를 추가합니다."
        // #swagger.tags = ["원생"]
        // #swagger.summary = "원생 <-> 반 추가"
        const student_id = req.params.student_id;
        const class_id = req.params.class_id;
        try{
            if (!await models.StudentInfo.findOne({
                where : {id : student_id}
            })){return res.send("student_id not exist")}

            if (!await models.Class.findOne({
                where : {id : class_id}
            })){return res.send("class_id not exist")}

            await models.ClassStudent.destroy({
                where: {student: student_id}
            })
            await models.ClassStudent.create({
                student: student_id, 
                class: class_id
            })
            res.send("ClassStudent Successfully created")
        }
        catch(err){
            res.status(500).send({
                message:
                    err.message || "some error occured"
            })
        }
    },

    StudentClassUpdate: async (req, res) => {
        // #swagger.description = "원생 <-> 반 정보를 수정합니다."
        // #swagger.tags = ["원생"]
        // #swagger.summary = "원생 <-> 반 추가"
        const student_id = req.params.student_id;
        const class_id = req.params.class_id;
        try{
            await models.ClassStudent.destroy({
                where : {student: student_id}
            })
            
            await models.ClassStudent.create({
                student: student_id, 
                class: class_id
            })
            res.send("ClassStudent Successfully updated")
        }
        catch(err){
            res.status(500).send({
                message:
                    err.message || "some error occured"
            })
        }
    },

    StudentRead: async (req, res, next) => {
        /* #swagger.description = 
        "원생을 조회합니다. id가 0이면 모두 검색, 0이 아닐 시 해당 id만 검색합니다. <br />
        <br />
        ***RESPONSE*** <br />
        dob : 태어난 날 <br />
        Rep : 주 보호자 <br />
        career : 태권도 경력 <br />
        level : 품/단 <br />
        level_number : 품/단증 번호 <br />
        ssn : 주민번호 <br />
        poomsae : 품새 <br />
        jump_career : 줄넘기 경력 <br />
        jump_level : 줄넘기 급수 <br />
        paying_amount : default 수강료 <br />
        payment_method : default 납부 방법 <br />
        payment_memo : default 납부 참고사항 <br />
        dojang_reg_date : 도장 등록일 <br />
        createdAt : 수련생 등록일 <br />
        "
        */
        // #swagger.tags = ["원생"]
        // #swagger.summary = "원생 조회[manage/student-3]"
        /* #swagger.parameters['page'] = {
            in: "query",
            description: "페이지",
            type: "integer"
        }
        */
        
        student_id = req.params.student_id;
        let pageNum = req.query.page; // 요청 페이지 넘버
        let offset = 0;
        if(pageNum > 1){
            offset = 7 * (pageNum - 1);
        }
        if (student_id!=0) { // id 0이 아닐 때 하나 찾기
            try{
                student_temp = await models.StudentInfo.findOne({
                    where: {id: student_id},
                    attributes: ['user'],
                    raw: true
                })
                console.log(student_temp,"student_temp")
                let student_account = ""
                if(student_temp.user){
                    student_account = await models.UserAccount.findOne({
                        where: {id: student_temp.user},
                        attributes: ['username'],
                        raw: true
                    })
                }
                console.log(student_account,"student_account")
                let student_info = await models.StudentInfo.findAll({
                    where: {id:student_id},
                    attributes: {
                        include: [
                            [sequelize.fn('date_format', sequelize.col('dojang_reg_date'), '%Y-%m-%d'), 'dojang_reg_date'],
                            [sequelize.fn('date_format', sequelize.col('StudentInfo.createdAt'), '%Y-%m-%d'), 'createdAt'],
                            [sequelize.fn('date_format', sequelize.col('StudentInfo.updatedAt'), '%Y-%m-%d'), 'updatedAt'],
                            'dojang'
                        ]
                    },
                    order: [['id', 'desc']],
                    raw: true
                })
                let parentsstudent = await models.ParentsStudents.findAll({
                    where : {student: student_id},
                    attributes: ['parents','relation'],
                    raw:true
                })
                let parents_arr = []
                for(let el of parentsstudent){
                    let parents_info = await models.ParentsInfo.findOne({
                        where : {id: el.parents},
                        attributes: ['id','first_name','last_name','phone_number','user'],
                        raw: true
                    })
                    let parents_account_info = await models.UserAccount.findOne({
                        where : {id : parents_info.user},
                        attributes: ['username','role'],
                        raw: true
                    })
                    parents_info['relation'] = el.relation
                    parents_info['UserAccount'] = parents_account_info
                    parents_arr.push(parents_info)
                }
                let classstudent_info = await models.ClassStudent.findOne({
                    where: {student:student_id},
                    attributes: ['class'],
                    raw: true
                })
                let class_info = ""
                if(classstudent_info){
                    class_info = await models.Class.findOne({
                        where: {id:classstudent_info.class},
                        attributes: ['id','title'],
                        raw: true
                    })
                }
                
                dojang_info = await models.Dojang.findOne({
                    where: {id:student_info[0].dojang},
                    attributes: ['id','name'],
                    raw: true
                })
                
                student_info[0]["user_name"] = student_account.username
                student_info[0]["ParentsInfos"] = parents_arr
                student_info[0]["classInfos"] = class_info
                student_info[0]["DojangInfos"] = dojang_info
                return res.send(student_info)
            }
            catch(err){
                await res.status(500).send({
                    message:
                        err.message || "some error occured"
                })
            }
        }
        else { // id == 0 이면 모두 찾기
            try{
                const data = await models.StudentInfo.findAll({
                    offset: offset,
                    limit: 7,
                    attributes: {
                        include: [
                            [sequelize.fn('date_format', sequelize.col('dojang_reg_date'), '%Y-%m-%d'), 'dojang_reg_date'],
                            [sequelize.fn('date_format', sequelize.col('StudentInfo.createdAt'), '%Y-%m-%d'), 'createdAt'],
                            [sequelize.fn('date_format', sequelize.col('StudentInfo.updatedAt'), '%Y-%m-%d'), 'updatedAt'],
                        ]
                    }
                })
                res.send(data)
            }
            catch(err) {
                await res.status(500).send({
                    message:
                        err.message || "some error occured"
                })
            }
        }
    },

    StudentRelativeRead: async (req, res, next) => {
        // #swagger.description = "원생을 조회합니다. id가 0이면 모두 검색, 0이 아닐 시 해당 id만 검색합니다."
        // #swagger.tags = ["원생"]
        // #swagger.summary = "원생 조회"
        /* #swagger.parameters['page'] = {
            in: "query",
            description: "페이지",
            type: "integer"
        }
        */
        student_id = req.params.student_id;
        let pageNum = req.query.page; // 요청 페이지 넘버
        let offset = 0;
        if(pageNum > 1){
            offset = 7 * (pageNum - 1);
        }
        if (student_id!=0) { // id 0이 아닐 때 하나 찾기
            try{
                const data = await models.StudentInfo.findAll({
                    where: {id:student_id},
                    include: [
                        {
                            model: models.ParentsInfo,
                            attributes: ['id','first_name','last_name','phone_number','photo_url'],
                            through: {
                                where: {student:student_id},
                                attributes: [],
                            },
                            include:[{
                                model: models.UserAccount,
                                attributes: ['username','role']
                            }]
                        },
                        {
                            model: models.Class,
                            through: {
                                attributes: [],
                            },
                            attributes: ['id','title']
                        },
                    ],
                    attributes: 
                        ['id','first_name','last_name','photo_url','phone_number','dob','Rep_name','Rep_phone_number', 'Rep_rel', 'level', 
                        [sequelize.fn('date_format', sequelize.col('StudentInfo.dob'), '%Y-%m-%d'), 'dob'],],
                                

                    order: [['id', 'desc']]
                })
                res.send(data)
            }
            catch(err){
                await res.status(500).send({
                    message:
                        err.message || "some error occured"
                })
            }
        }
        else if (student_id==0){ // id == 0 이면 모두 찾기
            try{
                const data = await models.StudentInfo.findAll({
                    include: [
                        {
                            model: models.ParentsInfo,
                            attributes: ['id','first_name','last_name','phone_number','photo_url'],
                            through: {
                                where: {student:student_id},
                                attributes: [],
                            },
                            include:[{
                                model: models.UserAccount,
                                attributes: ['username','role']
                            }]
                        },
                        {
                            model: models.Class,
                            through: {
                                attributes: [],
                            },
                            attributes: ['id','title']
                        },
                    ],
                    attributes: 
                        ['id','first_name','last_name','photo_url','phone_number','dob','Rep_name','Rep_phone_number', 'Rep_rel', 'level',
                        [sequelize.fn('date_format', sequelize.col('StudentInfo.dob'), '%Y-%m-%d'), 'dob'],],

                    order: [['id', 'desc']]
                })
                res.send(data)
            }
            catch(err) {
                await res.status(500).send({
                    message:
                        err.message || "some error occured"
                })
            }
        }
    },

    StudentReadByBasic: async (req, res, next) => {
        /* #swagger.description = 
        "기본정보로 원생을 조회합니다. <br />
        <br />
        ***RESPONSE*** <br />
        ssn : 주민번호 <br />
        level : 품/단 <br />
        "
        */
        // #swagger.tags = ["원생"]
        // #swagger.summary = "원생 조회"
        /* #swagger.parameters['student_lastname'] = {
            in: "query",
            type: "string"
        },
        #swagger.parameters['student_firstname'] = {
            in: "query",
            type: "string"
        },
        #swagger.parameters['student_ssn'] = {
            in: "query",
            type: "string"
        },
        #swagger.parameters['student_sex'] = {
            in: "query",
            type: "string"
        },
        */
        
        student_lastname = req.query.student_lastname;
        student_firstname = req.query.student_firstname;
        student_dob = req.query.student_dob;
        student_sex = req.query.student_sex;
        try{
            const data = await models.StudentInfo.findAll({
                where: {
                    last_name:student_lastname,
                    first_name:student_firstname,
                    dob:student_dob,
                    sex:student_sex,
                },
                attributes: ['id','last_name', 'first_name', 'dob', 'level', 'photo_url','sex']
            })
            res.send(data)
            }
        catch(err){
            await res.status(500).send({
                message:
                    err.message || "some error occured"
            })
        }
    },

    StudentReadByUnique: async (req, res, next) => {
        /* #swagger.description = 
        "고유번호로 원생을 조회합니다. <br />
        <br />
        ***RESPONSE*** <br />
        ssn : 주민번호 <br />
        level : 품/단 <br />
        "
        */
        // #swagger.tags = ["원생"]
        // #swagger.summary = "원생 조회"
                
        unique_id = req.params.unique_id;
        try{
            const data = await models.StudentInfo.findAll({
                where: {
                    unique_id:unique_id,
                },
                attributes: ['id','last_name', 'first_name', 'dob', 'level', 'photo_url', 'sex'
                [sequelize.fn('date_format', sequelize.col('StudentInfo.dob'), '%Y-%m-%d'), 'dob'],]
            })
            res.send(data)
            }
        catch(err){
            await res.status(500).send({
                message:
                    err.message || "some error occured"
            })
        }
    },
    
    StudentReadByClass: async (req,res) => {
        /* #swagger.description = "도장, 반 별로 원생 조회. <br />
        반 ID 0입력시 전체 반 조회, 특정 ID 조회시 특정반만 조회 <br /><br />

        ***RESPONSE*** <br />
        sex : 성별, <br />
        dob : 태어난 날(date of birth)
        "
        */
        // #swagger.tags = ["원생"]
        // #swagger.summary = "도장, 반 별 원생 조회"
        class_id = req.params.class_id;
        dojang_id = req.params.dojang_id;
        try{
            if (!await models.Class.findOne({
                where : {id : class_id}
            }) && class_id != 0){return res.send("class_id not exist")}

            if (!await models.Dojang.findOne({
                where : {id : dojang_id}
            })){return res.send({"message":"dojang_id not exist"})}

            if(class_id != 0){
                let result_obj = new Object
                //해당 반의 모든 원생 구하고
                const classstudent_info = await models.ClassStudent.findAll({
                    where: {class :class_id},
                    attributes: ['student']
                })
                const class_info = await models.Class.findOne({
                    where: {id:class_id,dojang:dojang_id},
                    attributes: ['id','title'],
                    raw:true
                })
                student_arr = []
                for(let classstudent of classstudent_info){
                    let student_info = await models.StudentInfo.findOne({
                        where: {id: classstudent.student, dojang: dojang_id},
                        attributes: ['id','photo_url','first_name','last_name','level','sex','dob','phone_number','jump_career','jump_level','dojang_reg_date','dojang'],
                        raw:true
                    })
                    if(student_info){
                        let level_info = await models.LevelInfo.findOne({
                            where: { dojang_fk_id: student_info.dojang, level_name: student_info.level},
                            attributes: ['belt_img_url'],
                            raw:true
                        })
                        student_info["belt_img_url"] = level_info.belt_img_url
                        student_info["Classes"] = class_info
                        student_arr.push(student_info)
                    }
                }

                result_obj["count"] = student_arr.length
                result_obj["rows"] = student_arr
                res.send(result_obj);
            }
            else if(class_id == 0){
                let result_obj = new Object
                let student_arr = []
                //도장의 모든 반 구하고
                const classes_info = await models.Class.findAll({
                    where: {dojang: dojang_id},
                    attributes: ['id'],
                    raw:true
                })
                //각 반의 원생 구하고
                for(let el of classes_info){
                    console.log(el,"el")
                    const classstudent_info = await models.ClassStudent.findAll({
                        where: {class :el.id},
                        attributes: ['student'],
                        raw:true
                    })
                    const class_info = await models.Class.findOne({
                        where: {id:el.id},
                        attributes: ['id','title'],
                        raw:true
                    })
                    
                    for(let classstudent of classstudent_info){
                        let student_info = await models.StudentInfo.findOne({
                            where: {id: classstudent.student},
                            attributes: ['id','photo_url','first_name','last_name','level','sex','dob','phone_number','jump_career','jump_level', 'dojang_reg_date', 'dojang'],
                            raw:true
                        })
                        if(student_info){
                            console.log(student_info,"student_info")
                            let level_info = await models.LevelInfo.findOne({
                                where: { dojang_fk_id: student_info.dojang, level_name: student_info.level},
                                attributes: ['belt_img_url'],
                                raw:true
                            })
                            console.log(level_info,"level_info")
                            if(level_info){
                                student_info["belt_img_url"] = level_info.belt_img_url
                            }
                            student_info["Classes"] = class_info
                            student_arr.push(student_info)
                        }
                        
                    }
                    console.log(student_arr)
                }
                result_obj["count"] = student_arr.length
                result_obj["rows"] = student_arr
                res.send(result_obj);
            }
        }
        catch(err){
            res.status(500).send({
                message:
                    err.message || "some error occured"
            })
        }
    },

    StudentReadByClassApp: async (req,res) => {
        /* #swagger.description = "도장, 반 별로 원생 조회. <br />
        반 ID 0입력시 전체 반 조회, 특정 ID 조회시 특정반만 조회 <br /><br />

        ***RESPONSE*** <br />
        sex : 성별, <br />
        dob : 태어난 날(date of birth)
        "
        */
        // #swagger.tags = ["원생"]
        // #swagger.summary = "도장, 반 별 원생 조회(앱용)"
        dojang_id =req.params.dojang_id
        class_id = req.params.class_id;
        let today = new Date
        const year = today.getFullYear()
        const month = today.getMonth() + 1
        const date = today.getDate()
        console.log(month,"month")
        console.log(date,"date")
        try{
            if (!await models.Class.findOne({
                where : {id : class_id}
            }) && class_id != 0){return res.send({"message":"class_id not exist"})}

            if (!await models.Dojang.findOne({
                where : {id : dojang_id}
            })){return res.send({"message":"dojang_id not exist"})}

            if(class_id == 0){
                let student_info = await models.StudentInfo.findAll({
                    where: {dojang:dojang_id},
                    attributes:['id','photo_url','last_name','first_name','level','dob','phone_number'],
                    raw:true
                })
                for(let student_one of student_info){
                    let level_info = await models.LevelInfo.findOne({
                        where: {level_name: student_one.level},
                        attributes: ['belt_img_url'],
                        raw:true
                    })
                    if(level_info){
                        student_one['belt_img_url'] = level_info.belt_img_url
                    }
                    else{
                        student_one['belt_img_url'] = ""
                    }
                    let attendance_query = `
                        SELECT A.is_attended FROM Attendances AS A 
                        WHERE A.student=${student_one.id} AND DATE(A.createdAt)="${year}-${month}-${date}" 
                        `
                    const attendance_info = await sequelize.query(attendance_query, {
                            type: Sequelize.QueryTypes.SELECT, 
                            raw: true   
                        });
                    if(attendance_info[0]){
                        student_one['is_attended'] = attendance_info[0].is_attended
                    }
                    else{
                        student_one['is_attended'] = null
                    }
                    let classstudent_info = await models.ClassStudent.findOne({
                        where: {student: student_one.id},
                        attributes: ['class'],
                        raw:true
                    })
                    if(classstudent_info){
                        let class_info = await models.Class.findOne({
                            where: {id: classstudent_info.class},
                            attributes: ['title'],
                            raw:true
                        })
                        
                        student_one['class_name'] = class_info.title
                    }
                    else{
                        student_one['class_name'] = ""
                    }
                }
                return res.send(student_info)
            }
            else if(class_id != 0){
                console.log("2222")
                let result_arr = []
                let classstudent_info = await models.ClassStudent.findAll({
                    where: {class: class_id},
                    attributes: ['student'],
                    raw:true
                })
                for(let classstudent_one of classstudent_info){
                    let student_info = await models.StudentInfo.findOne({
                        where: {id: classstudent_one.student},
                        attributes:['id','photo_url','last_name','first_name','level','dob','phone_number'],
                        raw:true
                    })
                    let level_info = await models.LevelInfo.findOne({
                        where: {level_name: student_info.level},
                        attributes: ['belt_img_url'],
                        raw:true
                    })
                    if(level_info){
                        student_info['belt_img_url'] = level_info.belt_img_url
                    }
                    else{
                        student_info['belt_img_url'] = ""
                    }
                    let attendance_query = `
                        SELECT A.is_attended FROM Attendances AS A 
                        WHERE A.student=${student_info.id} AND DATE(A.createdAt)="${year}-${month}-${date}" 
                        `
                    const attendance_info = await sequelize.query(attendance_query, {
                            type: Sequelize.QueryTypes.SELECT, 
                            raw: true   
                        });
                    if(attendance_info[0]){
                        student_info['is_attended'] = attendance_info[0].is_attended
                    }
                    else{
                        student_info['is_attended'] = null
                    }
                    
                    let class_info = await models.Class.findOne({
                        where: {id: class_id},
                        attributes: ['title'],
                        raw:true
                    })
                    if(class_info){
                        student_info['class_name'] = class_info.title
                    }
                    else{
                        student_info['class_name'] = ""
                    }
                    result_arr.push(student_info)
                }
                return res.send(result_arr)
            }
        }
        catch(err){
            res.status(500).send({
                message:
                    err.message || "some error occured"
            })
        }
    },

    StudentReadExcept: async (req, res, next) => {
        // #swagger.description = "도장 ID, 반 이름을 받아 해당 반에 속해있지 않은 원생을 조회합니다. <br /> 반 정보가 없으면 빈 배열로 전달 됩니다"
        // #swagger.tags = ["원생"]
        // #swagger.summary = "원생 조회"
        
        const dojang_id = req.params.dojang_id;
        const class_id = req.params.class_id;
        try{
            if (!await models.Class.findOne({
                where : {id : class_id}
            })){return res.send("class_id not exist")}

            if (!await models.Dojang.findOne({
                where : {id : dojang_id}
            })){return res.send("dojang_id not exist")}

            if (!await models.Class.findOne({
                where : {dojang: dojang_id, id: class_id}
            })){return res.send("Class Dojang are not associated")}
            
            let result =[]
            console.log("^^")
            let students = await models.StudentInfo.findAll({
                include: [{
                    model: models.Dojang,
                    where : {
                        id:dojang_id,
                    },
                    attributes: ['id']
                },
                ],
                attributes: [
                        'id','last_name','first_name','photo_url','sex','phone_number',
                        [sequelize.fn('date_format', sequelize.col('dojang_reg_date'), '%Y-%m-%d'), 'dojang_reg_date'],
                        [sequelize.fn('date_format', sequelize.col('StudentInfo.createdAt'), '%Y-%m-%d'), 'createdAt'],
                        [sequelize.fn('date_format', sequelize.col('StudentInfo.updatedAt'), '%Y-%m-%d'), 'updatedAt'],
                    ],
                raw: true
            })
            console.log("****")
            for (let student of students){
                if(!await models.ClassStudent.findOne({
                    where: {class: class_id, student: student.id}
                })
                ){
                    let student_info = await models.StudentInfo.findOne({
                        where: {id:student.id},
                        raw: true
                    })
                    console.log(student_info,"student_info")
                    let classstudent_info = await models.ClassStudent.findOne({
                        where: {student: student.id},
                        attributes: ['class'],
                        raw: true
                    })
                    console.log(classstudent_info,"classstudent_info")
                    console.log(student.id,"student")
                    let class_info = []
                    if(classstudent_info){
                        class_info = await models.Class.findOne({
                            where: {id: classstudent_info.class},
                            attributes: ['id','title']
                        })
                    }
                    console.log(class_info,"class_info")
                    student_info['Classes'] = class_info
                    result.push(student_info)
                }
            }

            res.send(result);
        }
        catch(err){
            res.status(500).send({
                message:
                    err.message || "some error occured"
            })
        }
    },
    
    StudentUpdate: async (req,res) => {
        /* #swagger.description = "원생을 수정합니다.  <br />
        user 는 수정이 없다면 안보내시면 되고 존재하는 ID로 입력하면 수정되며, null로 변경을 하시려면 -1을 입력 하면 됩니다 

        */
        // #swagger.tags = ["원생"]
        // #swagger.summary = "원생 수정"
        /* #swagger.parameters['obj'] = { 
            in: 'body',
            schema: { $ref: "#/definitions/student_create" }
        } */
        try{
            console.log(req.body,"req.body")
            const {first_name, last_name, phone_number, user, weight, 
                height, sex, country, level, level_number, ssn, poomsae, 
                language, is_apporved, email, school, Rep_name, Rep_phone_number, 
                Rep_rel, career, jump_level, jump_career, memo, due_date, 
                depositor_name, payment_method, payment_note, paying_amount, balance, dob,
                address_name, road_address, region_1depth_name, region_2depth_name, 
                region_3depth_name, address_detail, delImgname } =req.body;

            let FILE = req.file;
            let photo_url = []
            const student_id = req.params.student_id;
            if (!await models.StudentInfo.findOne({
                where : {id : student_id}
            })){return res.send("student not exist")}
            //기존 파일들 뽑아냄
            defaultPhoto = await models.StudentInfo.findOne({
                where: {id:student_id},
                attributes: ['photo_url'],
                raw: true
            })
            //string 형태를 json형태로 변환하는 역할
            // console.log(defaultPhoto,"defaultPhoto")
            defaultPhoto = defaultPhoto.photo_url.split(',')
            //img
            //해당 키의 파일이 있을때만 실행
            if(FILE){
                //원래 파일이 있으면 지우고 원래 파일 가공
                if(defaultPhoto){
                    default_img = defaultPhoto[0]
                    console.log(default_img,"default_img")
                    console.log(DEFAULT_PROFILE_URL,"DEFAULT_PROFILE_URL")
                    if(default_img != DEFAULT_PROFILE_URL)
                    {
                        await deleteFile(default_img)
                    }
                    await models.UrlGroup.destroy({ //url group에서 삭제하기
                        where: {urls: default_img}
                    })
                    //기본 배열 초기화 (파일 하나기 때문에)
                    default_img=[]; 
                    photo_url = default_img
                    
                }
                //원래 파일이 없다면 빈 배열 부여
                if(!photo_url){
                    photo_url = []
                }
                //받은 파일이 있으니 파일 생성 //single이면 file.length가 불가
                let imageName = generateFileName();
                if(await models.UrlGroup.findOne({
                    where: {urls:"student/img/"+imageName}
                })){imageName = generateFileName();}
                imageName = "student/img/"+imageName
                await models.UrlGroup.create({urls:imageName}) //url group에 늘리기
                await uploadFile(FILE.buffer, imageName, FILE.mimetype)
                photo_url.push(imageName)
                //저장을 위한 문자화
                photo_url = JSON.stringify(photo_url)
                //파일 하나인 경우 저장 시 key값만 저장하도록 가공
                photo_url = photo_url.slice(2,-2)
                //따로 따로 업데이트
                await models.StudentInfo.update(
                    {
                        photo_url
                    },
                    {
                        where: { id: student_id }
                    }
                )
            }
            else if(delImgname){
                default_img = defaultPhoto
                if(delImgname == default_img){
                    await deleteFile(default_img),
                    await models.UrlGroup.destroy({ //url group에서 삭제하기
                        where: {urls: default_img}
                    })
                }
                await models.StudentInfo.update(
                    {photo_url : null},
                    {where: {id : student_id}}
                )
            }
            //data
            //계정 연결
            console.log(user,"user")
            if(user == -1){
                console.log("111")
                await models.StudentInfo.update(
                    { 
                        user: null
                    },
                    {
                        where : { id: student_id }
                    }
                )
            }
            else{
                console.log("222")
                await models.StudentInfo.update(
                    { 
                        user
                    },
                    {
                        where : { id: student_id }
                    }
                )
            }
            
            await models.StudentInfo.update(
                { 
                    first_name, last_name, phone_number, weight, 
                height, sex, country, level, level_number, ssn, poomsae, 
                language, is_apporved, email, school, Rep_name, Rep_phone_number, 
                Rep_rel, career, jump_level, jump_career, memo, due_date, 
                depositor_name, payment_method, payment_note, paying_amount, balance, dob,
                address_name, road_address, region_1depth_name, region_2depth_name, 
                region_3depth_name, address_detail,
                },
                {
                    where : { id: student_id }
                }
            )
            let student_info = await models.StudentInfo.findOne({
                where: {id: student_id},
                attributes: ['user'],
                raw:true
            })
            console.log(student_info,"student_info")
            if(student_info.user){
                await models.UserAccount.update(
                    {
                        email, phone_number, first_name, last_name
                    },
                    {
                        where: {id : student_info.user}
                    } 
                ) 
            }
            res.send("Successfull updated")
        }
        catch(err){
            res.status(500).send({
                message:
                    err.message || "some error occured"
            })
        }
    },

    StudentDelete: async (req,res) => {
        // #swagger.description = "원생을 지웁니다."
        // #swagger.tags = ["원생"]
        // #swagger.summary = "원생 삭제"
        const student_id = req.params.student_id;
        await models.StudentInfo.destroy(
        {
            where : { id: student_id }
        } 
        ).then(() =>{
            res.send("StudentInfo successfully deleted")
        }).catch(err => {
            console.error(err);
        })
    },

    StudentDischarge: async (req, res) => {
        // #swagger.description = "도장에서 원생을 퇴소 처리합니다."
        // #swagger.tags = ["원생"]
        // #swagger.summary = "원생 퇴소"
        try{
            const student_id = req.params.student_id;
            const dojang_id = req.params.dojang_id;
            const today = new Date()
            
            let student_info = await models.StudentInfo.findOne({
                where: {id: student_id},
                attributes: ['user','last_name','first_name','level','dojang','dojang_reg_date'],
                raw:true
            })
            let dojang_info = await models.Dojang.findOne({
                where: {id: dojang_id},
                attributes:['name'],
                raw:true
            })

            await models.ClassStudent.destroy({
                where: {student: student_id}
            })

            await models.Student_log.create({
                student_user_id: student_info.user, last_name:student_info.last_name,
                first_name:student_info.first_name, dojang: dojang_id,
                dojang_start_date: student_info.dojang_reg_date,
                dojang_end_date: today, dojang_name: dojang_info.name,
                level: student_info.level
            })

            await models.StudentInfo.update(
                {
                    dojang: null
                },
                {
                    where: { id: student_id }
                },
                res.send("Student successfully discharged")
            )   
        }
        catch(err){
            res.status(500).send({
                message:
                    err.message || "some error occured"
            })
        }
    },

    StudentDeleteByTitle: async (req,res,next) => {
        // #swagger.description = "반 ID, 원생 ID를 받아 해당 반의 원생정보를 삭제합니다. 그 후 해당 반의 모든 정보를 반환합니다"
        // #swagger.tags = ["원생"]
        // #swagger.summary = "원생 삭제"
        const class_id = req.params.class_id;
        const student_id = req.params.student_id;
        try{
            await models.ClassStudent.destroy({
                where:{
                    class : class_id,
                    student: student_id
                }
            })
            const data = await models.InstructorClass.findAll({
                where : {class:class_id},
                attributes: {
                    include: [
                        [sequelize.fn('date_format', sequelize.col('InstructorClass.createdAt'), '%Y-%m-%d'), 'createdAt'],
                        [sequelize.fn('date_format', sequelize.col('InstructorClass.updatedAt'), '%Y-%m-%d'), 'updatedAt'],
                    ],
                },
            })
            res.send(data);
        }
        catch(err){
            res.status(500).send({
                message:
                    err.message || "some error occured"
            })
        }
    },

    StudentClassDelete: async (req,res) => {
        // #swagger.description = "원생 반정보를 지웁니다."
        // #swagger.tags = ["원생"]
        // #swagger.summary = "원생 반 정보 삭제"
        const student_id = req.params.student_id;
        const class_id = req.params.class_id;
        try{
            await models.ClassStudent.destroy(
                {
                    where: {student: student_id, class: class_id}
                },
                res.send("StudentClass successfully deleted")
            )
        }
        catch(err){
            res.status(500).send({
                message:
                    err.message || "some error occured"
            })
        }
    },

    AttendancesReadByDay: async (req, res, next) => {
        // #swagger.description = "날짜 정보를 입력 받아 출결 정보를 조회합니다."
        // #swagger.tags = ["원생"]
        // #swagger.summary = "출결 정보 조회"
        /* #swagger.parameters['page'] = {
            in: "query",
            description: "페이지",
            type: "integer"
        }
        */
        
        let dojang_id = req.params.dojang_id;
        let class_id = req.params.class_id;
        let year = req.params.year;
        let month = req.params.month;
        let day = req.params.day;

        let pageNum = req.query.page; // 요청 페이지 넘버
        let offset = 0;
        if(pageNum > 1){
            offset = 7 * (pageNum - 1);
        }

        try{
            let query = `
                        SELECT A.is_attended, date_format(A.createdAt,'%Y-%m-%d') as createdAt, date_format(A.updatedAt,'%Y-%m-%d') as updatedAt, S.first_name, S.last_name, S.dojang, C.title FROM Attendances AS A
                        RIGHT OUTER JOIN StudentInfos AS S 
                        ON A.student=S.id AND DATE(A.createdAt)="${year}-${month}-${day}"
                        INNER JOIN ClassStudents AS CS
                        ON S.id=CS.student
                        INNER JOIN Classes AS C
                        ON CS.class=C.id AND C.id="${class_id}"
                        WHERE S.dojang=${dojang_id} 
                        `
            const data = await sequelize.query(query, 
                {
                    type: Sequelize.QueryTypes.SELECT, 
                    raw: true   
                });
            res.send(data)
        }
        catch(err){
            await res.status(500).send({
                message:
                    err.message || "some error occured"
            })
        }
    },

    AttendancesReadByMonth: async (req, res, next) => {
        // #swagger.description = "날짜 정보(년,월 까지)를 입력 받아 출결 정보를 조회합니다. data[0]~[각 달의 일 수-1] student_id가 0이면 모두 조회, 특정 ID인 경우 한 수련생만 조회됩니다"
        // #swagger.tags = ["원생"]
        // #swagger.summary = "출결 정보 조회"
        
        dojang_id = req.params.dojang_id;
        class_id = req.params.class_id;
        student_id = req.params.student_id;
        year = req.params.year;
        month = req.params.month;
        
        let data = [];
        let result = [];
        
        try{
            if (!await models.Class.findOne({
                where : {id : class_id}
            }) && class_id != 0){return res.send("class_id not exist")}

            if (!await models.StudentInfo.findOne({
                where : {id : student_id}
            }) && student_id != 0){return res.send("Student_id not exist")}

            if (!await models.Dojang.findOne({
                where : {id : dojang_id}
            })){return res.send("dojang_id not exist")}

            if (!await models.Class.findOne({
                where : {dojang: dojang_id, id: class_id}
            }) && class_id != 0){return res.send("Class Dojang are not associated")}

            if (!await models.StudentInfo.findOne({
                where : {dojang: dojang_id, id: student_id}
            }) && student_id != 0){return res.send("Student Dojang are not associated")}

            if(student_id != 0){
                let Att_query = `--sql
                        SELECT A.is_attended, A.id, date_format(A.createdAt,'%Y-%m-%d') as createdAt
                        FROM StudentInfos AS S
                        RIGHT OUTER JOIN Attendances AS A
                        ON A.student=S.id 
                        WHERE S.id="${student_id}" AND MONTH(A.createdAt) = "${month}" AND YEAR(A.createdAt) = "${year}"
                        ORDER BY A.createdAt
                        `
                let Stu_query = `--sql
                        SELECT S.id, S.photo_url, S.level, S.dob, S.sex, S.last_name, S.first_name
                        FROM StudentInfos AS S
                        WHERE S.id="${student_id}"
                        ORDER BY S.id
                        `
                        Att_data = await sequelize.query(Att_query.slice(5,), 
                        {
                            type: Sequelize.QueryTypes.SELECT, 
                            raw: true
                        });
                        Stu_data = await sequelize.query(Stu_query.slice(5,), 
                        {
                            type: Sequelize.QueryTypes.SELECT, 
                            raw: true   
                        });
                        classstudent_data = await models.ClassStudent.findOne({
                            where: {student: student_id},
                            attributes: ['class'],
                            raw:true
                        })
                        class_data = await models.Class.findOne({
                            where: {id: classstudent_data.class},
                            attributes: ['id','title']
                        })
                        let temp = {"student_info":Stu_data, "att_data":Att_data, "class_data": class_data }

                        result.push(temp)
                
                return res.send(result)
            }
            if(class_id!=0)
            {
                //수련생 정보 먼저 얻고
                let query_student = 
                `--sql
                SELECT S.id, S.last_name, S.first_name , C.title, C.id as class_id FROM StudentInfos AS S
                INNER JOIN ClassStudents AS CS
                ON CS.student=S.id
                INNER JOIN Classes AS C
                ON CS.class=C.id AND C.id="${class_id}"
                WHERE S.dojang=${dojang_id}
                ORDER BY S.id
                `
                
                let student_info = await sequelize.query(query_student.slice(5,),
                {
                    type: Sequelize.QueryTypes.SELECT,
                    raw: true
                });
                console.log(student_info,"student_info")
                
                for(let el of student_info){
                        let Att_query = `--sql
                        SELECT A.is_attended, A.id, date_format(A.createdAt,'%Y-%m-%d') as createdAt
                        FROM StudentInfos AS S
                        RIGHT OUTER JOIN Attendances AS A
                        ON A.student=S.id 
                        WHERE S.id=${el.id} AND MONTH(A.createdAt) = "${month}" AND YEAR(A.createdAt) = "${year}"
                        ORDER BY A.createdAt
                        `

                        let Stu_query = `--sql
                        SELECT S.id, S.photo_url, S.level, S.dob, S.sex, S.last_name, S.first_name
                        FROM StudentInfos AS S
                        WHERE S.id=${el.id}
                        ORDER BY S.id
                        `

                        Att_data = await sequelize.query(Att_query.slice(5,), 
                        {
                            type: Sequelize.QueryTypes.SELECT, 
                            raw: true
                        });
                        Stu_data = await sequelize.query(Stu_query.slice(5,), 
                        {
                            type: Sequelize.QueryTypes.SELECT, 
                            raw: true   
                        });
                        classstudent_data = await models.ClassStudent.findOne({
                            where: {student: el.id},
                            attributes: ['class'],
                            raw:true
                        })
                        class_data = await models.Class.findOne({
                            where: {id: classstudent_data.class},
                            attributes: ['id','title']
                        })
                        let temp = {"student_info":Stu_data, "att_data":Att_data, "class_data": class_data }

                        result.push(temp)
                }
                res.send(result)
            }
            else if(class_id==0)
            {
                //수련생 정보 먼저 얻고
                let query_student = 
                `--sql
                SELECT S.id, S.last_name, S.first_name , C.title, C.id as class_id FROM StudentInfos AS S
                INNER JOIN ClassStudents AS CS
                ON CS.student=S.id
                INNER JOIN Classes AS C
                ON CS.class=C.id
                WHERE S.dojang=${dojang_id}
                ORDER BY S.id
                `
                
                let student_info = await sequelize.query(query_student.slice(5,),
                {
                    type: Sequelize.QueryTypes.SELECT,
                    raw: true
                });
                console.log(student_info,"student_info")
                
                for(let el of student_info){
                        let Att_query = `--sql
                        SELECT A.is_attended, A.id, date_format(A.createdAt,'%Y-%m-%d') as createdAt
                        FROM StudentInfos AS S
                        RIGHT OUTER JOIN Attendances AS A
                        ON A.student=S.id 
                        WHERE S.id=${el.id} AND MONTH(A.createdAt) = "${month}" AND YEAR(A.createdAt) = "${year}"
                        ORDER BY A.createdAt
                        `
                        let Stu_query = `--sql
                        SELECT S.id, S.photo_url, S.level, S.dob, S.sex, S.last_name, S.first_name
                        FROM StudentInfos AS S
                        WHERE S.id=${el.id}
                        ORDER BY S.id
                        `

                        Att_data = await sequelize.query(Att_query.slice(5,), 
                        {
                            type: Sequelize.QueryTypes.SELECT, 
                            raw: true
                        });
                        Stu_data = await sequelize.query(Stu_query.slice(5,), 
                        {
                            type: Sequelize.QueryTypes.SELECT, 
                            raw: true   
                        });
                        classstudent_data = await models.ClassStudent.findOne({
                            where: {student: el.id},
                            attributes: ['class'],
                            raw:true
                        })
                        class_data = await models.Class.findOne({
                            where: {id: classstudent_data.class},
                            attributes: ['id','title']
                        })
                        let temp = {"student_info":Stu_data, "att_data":Att_data, "class_data": class_data }

                        result.push(temp)
                }
                res.send(result)
            }
        }
        catch(err){
            await res.status(500).send({
                message:
                    err.message || "some error occured"
            })
        }
    },

    AttendancesUpdate: async (req, res, next) => {

    },

    StudentBillRead: async (req, res, next) => {
        /* #swagger.description = "도장 ID, 년, 월 정보를 받아 수련생 납부 정보 조회. <br />
        <br /> 등록된 정보가 있다면 등록된 데이터를 불러오고 없다면 default 값을 불러옵니다

        <br />

        ***RESPONSE*** <br /><br />
        
        studentInfo.~ 는 default 값<br />
        studentBill(depth가 1인 key)은 등록된 값 입니다<br /><br />

        sex : 성별, <br />
        dob : 태어난 날(date of birth) <br />
        depositor_name : 예금주 <br />
        paying_amount : 수련비 <br />
        paymnet_method : 납부 방법 <br />
        payment_note : 납부 메모 <br />
        due_date : 납부일
        "
        */
        // #swagger.tags = ["납부"]
        // #swagger.summary = "수련생 납부 조회(bill/resist-1)"
        
        try{
            const dojang_id = req.params.dojang_id;
            const class_id = req.params.class_id;
            const year = req.params.year;
            const month = req.params.month;
            ///모든 원생 구하고
            if(class_id != 0 ){
                ///원생 숫자 만큼 for loop 돌고
                let classstudent_info = await models.ClassStudent.findAll({
                    where: {class: class_id},
                    attributes:['student'],
                    raw:true
                })
                let data = [];
                i= 0;
                for(let classstudent_one of classstudent_info){
                    let class_info = []
                    ///각 원생의 id, 년, 월에 해당 하는 값이 studentbill에 있으면 불러오고
                    const result = await models.StudentBill.findOne(
                        {where: {paid_year: year, paid_month: month, student: classstudent_one.student } } )
                    const classstudent_info = await models.ClassStudent.findOne({
                        where: {student:  classstudent_one.student},
                        attributes: ['class'],
                        raw: true
                    })
                    console.log(classstudent_info,"classstudent_info")
                    if(classstudent_info){
                        class_info = await models.Class.findOne({
                            where: {id: classstudent_info.class},
                            attributes: ['id','title'],
                            raw: true
                        })
                    }
                    if(result){
                        data[i] = await models.StudentBill.findOne({
                            where: {
                                paid_year: year,
                                paid_month: month,
                                student:  classstudent_one.student
                            },
                            include: { 
                                model: models.StudentInfo,
                                attributes: ['id','photo_url','last_name','first_name','level','dob','sex','ssn','due_date','depositor_name','payment_note'],
                                
                            },
                            raw: true,
                            attributes: ['id','paying_amount','paid_amount','paid_date','payment_note','is_paid','paid_year','paid_month','payment_method',
                            [sequelize.fn('date_format', sequelize.col('StudentBill.paid_date'), '%Y-%m-%d'), 'paid_date']]
                        })
                        data[i]["class_info"] = class_info
                    }
                    /// 없으면 각 학생의 default값을 불러옴
                    else {
                        data[i] = await models.StudentInfo.findOne({
                            raw:true,
                            where: {id: classstudent_one.student},
                            attributes: [['id','StudentInfo.id'],['photo_url','StudentInfo.photo_url'],['first_name','StudentInfo.first_name'],['last_name','StudentInfo.last_name'],['level','StudentInfo.level'],['sex','StudentInfo.sex'],['ssn','StudentInfo.ssn'],['due_date','StudentInfo.due_date'],['depositor_name','StudentInfo.depositor_name'],'paying_amount','payment_method','payment_note',['dob','StudentInfo.dob'] ],
                        })
                        data[i].is_paid = 0
                        data[i].payment_method = null
                        data[i]["class_info"] = class_info
                    }
                    i += 1
                }
                
                data.forEach(el=>{
                    el['StudentInfo.dob'] = JSON.stringify(el['StudentInfo.dob']).slice(1)
                    el['StudentInfo.dob'] = el['StudentInfo.dob'].split('T')[0]
                })
                res.send(data)
            }
            else if(class_id == 0 ){
                ///원생 숫자 만큼 for loop 돌고
                let stu_cnt = await models.StudentInfo.findAndCountAll({
                    where: {
                        dojang: dojang_id,
                    },
                    raw: true,
                    attributes: ['id']
                })
                let data = [];
                for(i=0;i<stu_cnt["count"];i++){
                    let class_info = []
                    ///각 원생의 id, 년, 월에 해당 하는 값이 studentbill에 있으면 불러오고
                    const result = await models.StudentBill.findOne(
                        {where: {paid_year: year, paid_month: month, student: stu_cnt["rows"][i]["id"] } } )
                    const classstudent_info = await models.ClassStudent.findOne({
                        where: {student: stu_cnt["rows"][i]["id"]},
                        attributes: ['class'],
                        raw: true
                    })
                    console.log(classstudent_info,"classstudent_info")
                    if(classstudent_info){
                        class_info = await models.Class.findOne({
                            where: {id: classstudent_info.class},
                            attributes: ['id','title'],
                            raw: true
                        })
                    }
                    if(result){
                        data[i] = await models.StudentBill.findOne({
                            where: {
                                paid_year: year,
                                paid_month: month,
                                student: stu_cnt["rows"][i]["id"]
                            },
                            include: {
                                model: models.StudentInfo,
                                attributes: ['id','photo_url','last_name','first_name','level','dob','sex','ssn','due_date','depositor_name','payment_note'],
                                
                            },
                            raw: true,
                            attributes: ['id','paying_amount','paid_amount','payment_note','is_paid','paid_year','paid_month','payment_method',
                            [sequelize.fn('date_format', sequelize.col('StudentBill.paid_date'), '%Y-%m-%d'), 'paid_date']
                        ]
                        })
                        data[i]["class_info"] = class_info
                    }
                    /// 없으면 각 학생의 default값을 불러옴
                    else {
                        data[i] = await models.StudentInfo.findOne({
                            raw:true,
                            where: {id:stu_cnt["rows"][i]["id"]},
                            attributes: [['id','StudentInfo.id'],['photo_url','StudentInfo.photo_url'],['first_name','StudentInfo.first_name'],['last_name','StudentInfo.last_name'],['level','StudentInfo.level'],['sex','StudentInfo.sex'],['ssn','StudentInfo.ssn'],['due_date','StudentInfo.due_date'],['depositor_name','StudentInfo.depositor_name'],'paying_amount','payment_method','payment_note',['dob','StudentInfo.dob'] ],
                        })
                        data[i].is_paid = 0
                        data[i].payment_method = null
                        data[i]["class_info"] = class_info
                    }
                
                }
                
                data.forEach(el=>{
                    el['StudentInfo.dob'] = JSON.stringify(el['StudentInfo.dob']).slice(1)
                    el['StudentInfo.dob'] = el['StudentInfo.dob'].split('T')[0]
                    console.log(el['StudentInfo.photo_url'],"6666@")
                //     if(el['StudentInfo.photo_url']){el['StudentInfo.photo_url'] = el['StudentInfo.photo_url'].slice(2,-2).replace(/\\/ig,"\\\\")
                // }
                })
                res.send(data)
            }
        }
        catch(err){
            await res.status(500).send({
                message:
                    err.message || "some error occured"
            })
        }
    },

    StudentBillTotalRead: async (req, res, next) => {
        /* #swagger.description = "수련생 납부/미납 총액 조회"
        */
        // #swagger.tags = ["납부"]
        // #swagger.summary = "수련생 납부/미납 총액 조회"
        try{
            const dojang_id = req.params.dojang_id;
            const class_id = req.params.class_id;
            const year = req.params.year;
            const month = req.params.month;
            let total_paying_amount = 0
            let total_paid_amount = 0
            let result_obj = new Object

            if(class_id == 0 ){
                let student_info = await models.StudentInfo.findAll({
                    where: {dojang: dojang_id},
                    raw:true
                })
                for(let student_one of student_info){
                    let studentbill_info = await models.StudentBill.findOne({
                        where: {
                            student:student_one.id,
                            paid_year: year,
                            paid_month: month,
                        },
                        raw:true
                    })
                    console.log(student_one.id,"student_one.id")
                    if(studentbill_info){
                        studentbill_info.paying_amount = JSON.parse(studentbill_info.paying_amount)
                        console.log(studentbill_info.paying_amount,"studentbill_info.paying_amount")
                        total_paying_amount += studentbill_info.paying_amount
                        if(studentbill_info.is_paid == 1){
                            total_paid_amount += studentbill_info.paying_amount
                        }
                    }
                    else{
                        console.log(student_one.paying_amount,"student_one.paying_amount")
                        total_paying_amount += student_one.paying_amount
                    }
                }
                result_obj["total_paying_amount"] = total_paying_amount
                result_obj["total_paid_amount"] = total_paid_amount
                result_obj["total_non_paid_amount"] = total_paying_amount - total_paid_amount
                return res.send(result_obj)
            }
            else if(class_id != 0 ){
                let class_info = await models.Class.findOne({
                    where:{id: class_id, dojang: dojang_id},
                    raw:true
                })
                if(!class_info){
                    result_obj["result"] = "Inserted class_id is not associated with dojang_id"
                    return res.send(result_obj)
                }
                let classstudent_info = await models.ClassStudent.findAll({
                    where: {class: class_id},
                    attributes:['student'],
                    raw:true
                })
                console.log(classstudent_info,"classstudent_info")
                for(let classstudent_one of classstudent_info){
                    let student_one = await models.StudentInfo.findOne({
                        where: {id: classstudent_one.student},
                        raw:true
                    })
                    let studentbill_info = await models.StudentBill.findOne({
                        where: {
                            student:student_one.id,
                            paid_year: year,
                            paid_month: month,
                        },
                        raw:true
                    })
                    console.log(student_one.id,"student_one.student")
                    if(studentbill_info){
                        studentbill_info.paying_amount = JSON.parse(studentbill_info.paying_amount)
                        console.log(studentbill_info.paying_amount,"studentbill_info.paying_amount")
                        total_paying_amount += studentbill_info.paying_amount
                        if(studentbill_info.is_paid == 1){
                            total_paid_amount += studentbill_info.paying_amount
                        }
                    }
                    else{
                        console.log(student_one.paying_amount,"student_one.paying_amount")
                        total_paying_amount += student_one.paying_amount
                    }
                }
                result_obj["total_paying_amount"] = total_paying_amount
                result_obj["total_paid_amount"] = total_paid_amount
                result_obj["total_non_paid_amount"] = total_paying_amount - total_paid_amount
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

    StudentBillCreate: async (req,res,next) => {
        /* #swagger.description = "납부 정보를 만듭니다. 등록 또는 수정이 가능합니다 <br />
        <br />
        ***Meaning*** <br />
        paid_year : 납부 연도 <br />
        paid_month : 납부 월 <br />
        paid_amount : 납부 금액 <br />
        paying_amount : 납부해야할 금액 <br />
        paid_date : 납부한 일자 <br />
        payment_note : 납부 관련 메모 <br />
        is_paid : 납부 유무 <br />
        "
        
        */
        // #swagger.tags = ["납부"]
        // #swagger.summary = "납부 생성"
        
        try{
            const { paid_year, paid_month, paid_amount, paying_amount, 
                paid_date, payment_note, payment_method, is_paid } = req.body;
            const student_id = req.params.student_id
            let student_info = await models.StudentInfo.findOne({
                where : {id : student_id},
                raw:true
            })
            if (!student_info){return res.send("student_id not exist")}
            console.log(paid_date,"paid_date")
            
            //납부 정보가 없으면 새로 만들고
            if(!await models.StudentBill.findOne({
                where : {student : student_id, paid_year: paid_year, paid_month: paid_month}
            })){
                if(is_paid == 1){
                    await models.StudentBill.create({ student: student_id, paid_year, 
                        paid_amount: paying_amount, paid_month, paying_amount:student_info.paying_amount, 
                        paid_date, payment_note, 
                        payment_method, is_paid})
                    return res.send("StudentBill Successfully created")
                }
                else if(is_paid == 0){
                    await models.StudentBill.create({ student: student_id, paid_year, 
                        paid_amount : 0, paid_month, paying_amount:student_info.paying_amount, 
                        paid_date, payment_note, 
                        payment_method, is_paid})
                    return res.send("StudentBill Successfully created")
                }
            }
            //납부 정보가 있으면 지우고 만든다
            else if(await models.StudentBill.findOne({
                where : {student : student_id, paid_year: paid_year, paid_month: paid_month}
            })){
                await models.StudentBill.destroy({
                    where: {student:student_id, paid_year: paid_year, paid_month: paid_month}
                })
                if(!paid_date){
                    await models.StudentBill.create({ student: student_id, paid_year, 
                        paid_month, paying_amount:student_info.paying_amount,
                        paid_date:null, payment_note, 
                        payment_method, is_paid})
                }
                else{
                    await models.StudentBill.create({ student: student_id, paid_year, 
                        paid_month, paying_amount:student_info.paying_amount, 
                        paid_date, payment_note, 
                        payment_method, is_paid})
                }
                return res.send("StudentBill Successfully updated")
            }
        }
        catch(err){
            await res.status(500).send({
                message:
                    err.message || "some error occured"
            })
        }
    },

    StudentBillUpdate: async (req, res, next) => {
        /* #swagger.description = "도장 ID, 년, 월 정보를 받아 수련생 납부 정보 수정/등록. <br />
        <br />

        ***RESPONSE*** <br /><br />
        
        studentInfo는 default 값<br />
        studentBill은 등록된 값 입니다<br /><br />

        sex : 성별, <br />
        dob : 태어난 날(date of birth) <br />
        depositor_name : 예금주 <br />
        paying_amount : 수련비 <br />
        paymnet_method : 납부 방법 <br />
        payment_note : 납부 메모 <br />
        "
        */
        // #swagger.tags = ["원생"]
        // #swagger.summary = "수련생 납부 수정(bill/resist-1)"
        const dojang_id = req.params.dojang_id;
        const year = req.params.year;
        const month = req.params.month;
        const data = req.body;
        ///1. 한 로우 값의 정보가 studentbills에 있는지 확인
        ///2. 있다면 put으로 수정 정보
        ///3. 없으면 create 등록
        try{
            if(result){
                data[i] = await models.StudentBill.findOne({
                    where: {
                        paid_year: year,
                        paid_month: month,
                        student: stu_cnt["rows"][i]["id"]
                    },
                    include: {
                        model: models.StudentInfo,
                        attributes: ['id','photo_url','last_name','first_name','level','sex','ssn','due_date','depositor_name','payment_note']
                    },
                    raw: true,
                    attributes: ['id','paying_amount','paid_amount','paid_date','payment_note','is_paid','paid_year','paid_month']
                })
            }
            /// 없으면 각 학생의 default값을 불러옴
            else {
                data[i] = await models.StudentInfo.findOne({
                where: {id:stu_cnt["rows"][i]["id"]},
                attributes: [['id','StudentInfo.id'],['photo_url','StudentInfo.photo_url'],['first_name','StudentInfo.first_name'],['last_name','StudentInfo.last_name'],['level','StudentInfo.level'],['sex','StudentInfo.sex'],['ssn','StudentInfo.ssn'],['due_date','StudentInfo.due_date'],['depositor_name','StudentInfo.depositor_name'],['paying_amount','StudentInfo.paying_amount'],['payment_method','StudentInfo.payment_method'],['payment_note','StudentInfo.payment_note'] ],
                })
            }
            
            res.send(data)
        }
        catch(err){
            await res.status(500).send({
                message:
                    err.message || "some error occured"
            })
        }
    },


    //승급
    StudentLevelupCreate: async (req,res,next) => {
        // #swagger.description = "승급하기"
        // #swagger.tags = ["승급"]
        // #swagger.summary = "승급하기"
        try{
            //승급증, 승급서 req.files로 추가 예정

            let dojang_id = req.params.dojang_id
            let student_id = req.params.student_id
            //받는 id는 kwanjang_id 입니다
            const {id, 
                levelUpInfo, student_info, dojang_info, class_info, last_name, 
            first_name, phone_number} = req.body
            await models.LevelUpInfo.create({ 
                student: student_id, last_name: student_info.last_name, 
                first_name: student_info.first_name, sex: student_info.sex,
                photo_url: student_info.photo_url, height: student_info.height,
                weight: student_info.weight, phone_number: student_info.phone_number,
                email: student_info.email, address_name: student_info.address_name,
                address_detail: student_info.address_detail, 
                country: student_info.country, 
                level_before: student_info.level, level_after: levelUpInfo.level,
                levelup_date: levelUpInfo.regDate, dojang: dojang_id,
                dojang_reg_date: student_info.dojang_reg_date, dojang_name: dojang_info.name,
                dojang_signature: dojang_info.signature, 
                kwanjang: id, 
                kwanjang_last_name: last_name, kwanjang_first_name: first_name,
                kwanjang_phone_number: phone_number, dob:student_info.dob,
                class: class_info.id, class_title: class_info.title,
                })
                if(!levelUpInfo.level){
                    return res.send("level after must needed")
                }
                if(!levelUpInfo.regDate){
                    return res.send("regDate must needed")
                }
            await models.StudentInfo.update(
                {
                    level: levelUpInfo.level
                },
                {
                    where: {id: student_id}
                }
            )
            res.send("LevelUpInfo Successfully created")
        }
        catch(err){
            await res.status(500).send({
                message:
                    err.message || "some error occured"
            })
        }
    },

    StudentLevelupCreateMulti: async (req,res,next) => {
        // #swagger.description = "여러명 한번에 승급하기"
        // #swagger.tags = ["승급"]
        // #swagger.summary = "여러명 한번에 승급하기"
        try{
            //승급증, 승급서 req.files로 추가 예정
            let dojang_id = req.params.dojang_id
            console.log(dojang_id,"dojang_id")
            //받는 id는 kwanjang_id 입니다
            const { levelup_info_arr } = req.body
            console.log(levelup_info_arr,"levelup_info_arr")
            for(let levelup_info_one of levelup_info_arr){
                if(!levelup_info_one.student_level_after){
                    return res.send("level after must needed")
                }
                if(!levelup_info_one.student_levelup_date){
                    return res.send("regDate must needed")
                }
                await models.LevelUpInfo.create({ 
                    student: levelup_info_one.student_id, 
                    last_name: levelup_info_one.student_last_name, 
                    first_name: levelup_info_one.student_first_name, 
                    sex: levelup_info_one.student_sex,
                    photo_url: levelup_info_one.student_photo_url, 
                    weight: levelup_info_one.student_weight, 
                    height: levelup_info_one.student_height,
                    phone_number: levelup_info_one.student_phone_number,
                    email: levelup_info_one.student_email, 
                    country: levelup_info_one.student_country, 
                    dob:levelup_info_one.student_dob,
                    address_name: levelup_info_one.student_address_name,
                    address_detail: levelup_info_one.student_address_detail, 
                    level_before: levelup_info_one.student_level, 
                    level_after: levelup_info_one.student_level_after,//추가되는 부분
                    levelup_date: levelup_info_one.student_levelup_date,//추가되는 부분
                    dojang_reg_date: levelup_info_one.student_dojang_reg_date, 
                    dojang: dojang_id,
                    dojang_name: levelup_info_one.dojang_name,
                    dojang_signature: levelup_info_one.dojang_signature,  
                    class: levelup_info_one.class_id, 
                    class_title: levelup_info_one.class_title,
                    kwanjang: levelup_info_one.kwanjang_id, 
                    kwanjang_last_name: levelup_info_one.kwanjang_last_name, 
                    kwanjang_first_name: levelup_info_one.kwanjang_first_name,
                    kwanjang_phone_number: levelup_info_one.kwanjang_phone_number,
                    })
                    
                await models.StudentInfo.update(
                    {
                        level: levelup_info_one.student_level_after
                    },
                    {
                        where: {id: levelup_info_one.student_id}
                    }
                )
            }
            // return res.send(levelup_info_arr)
            res.send("LevelUpInfo Successfully created")
        }
        catch(err){
            await res.status(500).send({
                message:
                    err.message || "some error occured"
            })
        }
    },

    // StudentLevelupInfoRead: async (req, res, next) => {
    //     /* #swagger.description = 
    //     "원생 승급정보를 조회합니다.<br />
    //     <br />
    //     ***RESPONSE*** <br />
        
    //     payment_memo : default 납부 참고사항 <br />
    //     dojang_reg_date : 도장 등록일 <br />
    //     createdAt : 수련생 등록일 <br />
    //     "
    //     */
    //     // #swagger.tags = ["승급"]
    //     // #swagger.summary = "원생 승급정보 조회[levelup/Request-3]"

    //     dojang_id = req.params.dojang_id;
    //     kwanjang_id = req.params.kwanjang_id;
    //     student_id = req.params.student_id;
    //     try{
    //         const student_info = await models.StudentInfo.findOne({
    //             raw: true,
    //             where: {id: student_id, dojang: dojang_id},
    //             attributes: ['id','photo_url','last_name','first_name',
    //             'sex','weight','height','ssn','dob','phone_number','email','address_name',
    //             'address_detail','level','dojang_reg_date','country'],
    //             order: [['id', 'desc']]
    //         })

    //         const kwanjangdojang_info = await models.KwanjangDojang.findOne({
    //             where: {dojang: dojang_id},
    //             attributes: ['kwanjang'],
    //             raw:true
    //         })
    //         const kwanjang_info = await models.KwanjangInfo.findOne({
    //             where: {id : kwanjangdojang_info.kwanjang},
    //             raw: true,
                
    //             attributes:['id','last_name','first_name','phone_number']
    //         })
    //         const dojang_info = await models.Dojang.findOne({
    //             where: {id : dojang_id},
    //             attributes: ['id','name','signature']
    //         })
    //         const classstudent_info = await models.ClassStudent.findOne({
    //             where: {student: student_id},
    //             attributes: ['class'],
    //             raw: true
    //         })
    //         const class_info = await models.Class.findOne({
    //             where: {id: classstudent_info.class},
    //             attributes: ['id','title'],
    //             raw:true
    //         })
    //         kwanjang_info["class_info"] = class_info
    //         kwanjang_info["student_info"] = student_info
    //         kwanjang_info["dojang_info"] = dojang_info
    //         let data = []
    //         data.push(kwanjang_info)
    //         res.send(data)
    //     }
    //     catch(err){
    //         await res.status(500).send({
    //             message:
    //                 err.message || "some error occured"
    //         })
    //     }
    // },

    StudentLevelupInfoRead: async (req, res, next) => {
        /* #swagger.description = 
        "원생 승급정보를 조회합니다.<br />
        <br />
        ***RESPONSE*** <br />
        
        payment_memo : default 납부 참고사항 <br />
        dojang_reg_date : 도장 등록일 <br />
        createdAt : 수련생 등록일 <br />
        "
        */
        // #swagger.tags = ["승급"]
        // #swagger.summary = "원생 승급정보 조회[levelup/Request-3]"

        
        try{
            dojang_id = req.params.dojang_id;
            kwanjang_id = req.params.kwanjang_id;
            let { student_id_arr } = req.body;
            let result_arr = []
            for(let student_id of student_id_arr){
                const student_info = await models.StudentInfo.findOne({
                    raw: true,
                    where: {id: student_id, dojang: dojang_id},
                    attributes: [['id','student_id'],['photo_url','student_photo_url'],
                    ['last_name','student_last_name'],['first_name','student_first_name'],
                    ['sex','student_sex'],['weight','student_weight'],['height','student_height'],
                    ['ssn','student_ssn'],['dob','student_dob'],['phone_number','student_phone_number'],
                    ['email','student_email'],['address_name','student_address_name'],
                    ['address_detail','student_address_detail'],['level','student_level'],
                    ['dojang_reg_date','student_dojang_reg_date'],['country','student_country']],
                    order: [['id', 'desc']]
                })
                console.log(student_info,"student_info")
                const kwanjangdojang_info = await models.KwanjangDojang.findOne({
                    where: {dojang: dojang_id},
                    attributes: ['kwanjang'],
                    raw:true
                })
                const kwanjang_info = await models.KwanjangInfo.findOne({
                    where: {id : kwanjangdojang_info.kwanjang},
                    raw: true,
                    
                    attributes:[['id','kwanjang_id'],['last_name','kwanjang_last_name'],
                    ['first_name','kwanjang_first_name'],['phone_number','kwanjang_phone_number']]
                })
                const dojang_info = await models.Dojang.findOne({
                    where: {id : dojang_id},
                    attributes: [['id','dojang_id'],['name','dojang_name'],['signature','dojang_signature']],
                    raw:true
                })

                const classstudent_info = await models.ClassStudent.findOne({
                    where: {student: student_id},
                    attributes: ['class'],
                    raw: true
                })
                const class_info = await models.Class.findOne({
                    where: {id: classstudent_info.class},
                    attributes: [['id','class_id'],['title','class_title']],
                    raw:true
                })
                kwanjang_info["class_id"] = class_info.class_id
                kwanjang_info["class_title"] = class_info.class_title
                kwanjang_info["student_id"] = student_info.student_id
                kwanjang_info["student_photo_url"] = student_info.student_photo_url
                kwanjang_info["student_last_name"] = student_info.student_last_name
                kwanjang_info["student_first_name"] = student_info.student_first_name
                kwanjang_info["student_sex"] = student_info.student_sex
                kwanjang_info["student_weight"] = student_info.student_weight
                kwanjang_info["student_height"] = student_info.student_height
                kwanjang_info["student_ssn"] = student_info.student_ssn
                kwanjang_info["student_dob"] = student_info.student_dob
                kwanjang_info["student_phone_number"] = student_info.student_phone_number
                kwanjang_info["student_email"] = student_info.student_email
                kwanjang_info["student_address_name"] = student_info.student_address_name
                kwanjang_info["student_address_detail"] = student_info.student_address_detail
                kwanjang_info["student_level"] = student_info.student_level
                kwanjang_info["student_dojang_reg_date"] = student_info.student_dojang_reg_date
                kwanjang_info["student_country"] = student_info.student_country
                kwanjang_info["dojang_id"] = dojang_info.dojang_id
                kwanjang_info["dojang_name"] = dojang_info.dojang_name
                kwanjang_info["dojang_signature"] = dojang_info.dojang_signature
                
                result_arr.push(kwanjang_info)
            }
            res.send(result_arr)
        }
        catch(err){
            await res.status(500).send({
                message:
                    err.message || "some error occured"
            })
        }
    },

    StudentLevelupReadByMonth: async (req, res, next) => {
        /* #swagger.description = 
        "원생 승급이력을 조회합니다.<br />
        "
        */
        // #swagger.tags = ["승급"]
        // #swagger.summary = "원생 승급정보 조회"

        try{
            let dojang_id = req.params.dojang_id;
            let class_id = req.params.class_id;
            let year = req.params.year;
            let month = req.params.month;
            
            //전체 조회
            if(class_id == 0){
                const levelup_info = await models.LevelUpInfo.findAll({
                    where:{
                        dojang: dojang_id,
                        createdAt: sequelize.where(sequelize.fn('YEAR', sequelize.col('levelup_date')), year),
                        [Op.and]: sequelize.where(sequelize.fn('MONTH', sequelize.col('levelup_date')), month)
                    },
                    // attributes: ['id','photo_url','last_name','first_name','level_before','level_after','sex','dob','class','class_title','levelup_letter','levelup_certificate','levelup_date'],
                    raw:true,
                    order: [['createdAt','desc']]
                })
                return(res.send(levelup_info))
            }
            else if(class_id != 0){
                const levelup_info = await models.LevelUpInfo.findAll({
                    where:{
                        dojang: dojang_id, class: class_id,
                        createdAt: sequelize.where(sequelize.fn('YEAR', sequelize.col('levelup_date')), year),
                        [Op.and]: sequelize.where(sequelize.fn('MONTH', sequelize.col('levelup_date')), month)
                    },
                    // attributes: ['id','photo_url','last_name','first_name','level_before','level_after','sex','dob','class','class_title','levelup_letter','levelup_certificate','levelup_date'],
                    raw:true
                })
                return(res.send(levelup_info))
            }
        }
        catch(err){
            await res.status(500).send({
                message:
                    err.message || "some error occured"
            })
        }
    },

    LevelupReadByName: async (req, res, next) => {
        /* #swagger.description = 
        "하나의 원생 승급 이력 조회.<br />
        "
        */
        // #swagger.tags = ["승급"]
        // #swagger.summary = "하나의 원생 승급 이력 조회"

        try{
            const {last_name, first_name, dob} = req.body

            let levelup_info = await models.LevelUpInfo.findAll({
                where: {last_name : last_name, first_name: first_name, dob: dob},
                raw:true
            })
            return res.send(levelup_info)
        }
        catch(err){
            await res.status(500).send({
                message:
                    err.message || "some error occured"
            })
        }
    },

    
    
}
