const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const { sequelize } = require('../models')
const models = require("../models");

const crypto = require("crypto");
const generateFileName = (bytes = 8) =>
    crypto.randomBytes(bytes).toString("hex");
const { uploadFile, deleteFile } = require("../util/s3.js");

const { sendGroup } = require('../util/fcm');

module.exports = {
    //class
    ClassCreate: async (req,res,next) => {
        /* #swagger.description = "반을 만듭니다. kwanjang, dojang column INTEGER necessary" <br />
        mon_time 등 시간 입력시 ex) 12:00~13:00 처럼 "시작시간~끝나는시간"의 포맷 필요
        */
        // #swagger.tags = ["반"]
        // #swagger.summary = "반 생성"
        try{
            const {title, room, kwanjang, dojang, mon_time, tue_time, wed_time, thu_time, fri_time, sat_time, sun_time} = req.body;
            await models.Class.create({ title, room, kwanjang, dojang, mon_time, tue_time, wed_time, thu_time, fri_time, sat_time, sun_time})
            res.send("Class Successfully created")
        }
        catch(err){
            await res.status(500).send({
                message:
                    err.message || "some error occured"
            })
        }
    },
    ClassRead: async (req, res, next) => {
        // #swagger.description = "반을 조회합니다. id가 0이면 모두 검색, 0이 아닐 시 해당 id만 검색합니다."
        // #swagger.tags = ["반"]
        // #swagger.summary = "반 조회"
        /* #swagger.parameters['page'] = {
            in: "query",
            description: "페이지",
            type: "integer"
        }
        */
        class_id = req.params.class_id;
        dojang_id = req.params.dojang_id;
        let pageNum = req.query.page; // 요청 페이지 넘버
        let offset = 0;
        if(pageNum > 1){
            offset = 7 * (pageNum - 1);
        }
        try{
            if (class_id != 0) 
            { // id 0이 아닐 때 하나 찾기
                const data = await models.Class.findAll({
                    offset: offset,
                    where: {id:class_id},
                    limit: 7,
                    include: [
                        {
                            model: models.Dojang,
                            where: {id:dojang_id},
                            attributes: ['id','name','phone_number','address_name','address_detail','BR','BR_number','logo_img']
                        },
                        {
                            model: models.Sabum,
                            attributes: ['first_name','last_name','photo_url'],
                            through: {
                                attributes: ['class','sabum']
                            }
                        },
                        {
                            model: models.KwanjangInfo,
                            attributes: ['first_name','last_name','photo_url'],
                            through: {
                                attributes: ['class','kwanjang']
                            }
                        },
                        {
                            model: models.StudentInfo,
                            attributes: ['first_name','last_name','ssn','photo_url','level'],
                            through: {
                                attributes: ['class','student']
                            }
                        }
                    ],
                })
                res.send(data)
            }
            else if (class_id == 0) { // id == 0 이면 모두 찾기
                const data = await models.Class.findAll({
                    offset: offset,
                    limit: 7,
                    include: [
                        {
                            model: models.Dojang,
                            where: {id:dojang_id},
                            attributes: ['id','name','phone_number','address_name','address_detail','BR','BR_number','logo_img']
                        },
                        {
                            model: models.Sabum,
                            attributes: ['first_name','last_name','photo_url'],
                            through: {
                                attributes: ['class','sabum']
                            }
                        },
                        {
                            model: models.KwanjangInfo,
                            attributes: ['first_name','last_name','photo_url'],
                            through: {
                                attributes: ['class','kwanjang']
                            }
                        },
                        {
                            model: models.StudentInfo,
                            attributes: ['first_name','last_name','ssn','photo_url','level'],
                            through: {
                                attributes: ['class','student']
                            }
                        }
                    ],
                })
                res.send(data)
            }
        }
        catch(err) {
            res.status(500).send({
                message:
                    err.message || "some error occured"
            })
        }
    },

    ClassReadByDay: async (req, res, next) => {
        /* #swagger.description = "요일별로 존재하는 반정보를 조회합니다. <br />
        모든 요일 입력시 all <br /> 
        각 요일 입력시 ex) mon_time" <br /> 
        mon_time 입력시 ex) 12:00~13:00 처럼 "시작시간~끝나는시간"의 포맷 필요
        */
        // #swagger.tags = ["반"]
        // #swagger.summary = "요일별 반정보 조회"
        /* #swagger.parameters['page'] = {
            in: "query",
            description: "페이지",
            type: "integer"
        }
        */
        dojang_id = req.params.dojang_id;
        day = req.params.day;
        let pageNum = req.query.page; // 요청 페이지 넘버
        let offset = 0;
        if(pageNum > 1){
            offset = 7 * (pageNum - 1);
        }
        try{
            if (day == "all"){
                result_arr = []
                let class_info = await models.Class.findAll({
                    where: {dojang: dojang_id},
                    attributes: ['id', 'title','room','mon_time','tue_time',
                    'wed_time','thu_time','fri_time','sat_time','sun_time'],
                    raw:true
                })
                for(let el of class_info){
                    let classstudent_info = await models.ClassStudent.findAll({
                        where:{class:el.id},
                        attributes:['student'],
                        raw: true
                    })
                    // console.log(classstudent_info,"classstudent_info")
                    let instructorclass_info = await models.InstructorClass.findAll({
                        where:{class:el.id},
                        attributes:['kwanjang','sabum'],
                        raw:true
                    })
                    // console.log(instructorclass_info,"instructorclass_info")
                    
                    el['student_count'] = classstudent_info.length,
                    el['sabuCnt'] = instructorclass_info.length
                    console.log(el,'el')
                    result_arr.push(el)
                }
                res.send(result_arr)
            }
            else{
                result_arr = []
                let class_info = await models.Class.findAll({
                    where: {
                        dojang:dojang_id,
                        [day]: { [Op.ne]: null}
                    },
                    attributes: ['id', 'title','room','mon_time','tue_time',
                    'wed_time','thu_time','fri_time','sat_time','sun_time'],
                    raw:true
                })
                for(let el of class_info){
                    let classstudent_info = await models.ClassStudent.findAll({
                        where:{class:el.id},
                        attributes:['student'],
                        raw: true
                    })
                    // console.log(classstudent_info,"classstudent_info")
                    let instructorclass_info = await models.InstructorClass.findAll({
                        where:{class:el.id},
                        attributes:['kwanjang','sabum'],
                        raw:true
                    })
                    // console.log(instructorclass_info,"instructorclass_info")
                    
                    el['student_count'] = classstudent_info.length,
                    el['sabuCnt'] = instructorclass_info.length
                    console.log(el,'el')
                    result_arr.push(el)
                }
                res.send(result_arr)
            }
        }
        catch(err){
            await res.status(500).send({
                message:
                    err.message || "some error occured"
            })
        }
        
    },
    
    ClassReadForId: async (req, res, next) => {
        // #swagger.description = "도장정보를 받아 반 전부를 조회합니다."
        // #swagger.tags = ["반"]
        // #swagger.summary = "반 조회"
        /* #swagger.parameters['page'] = {
            in: "query",
            description: "페이지",
            type: "integer"
        }
        */
        dojang_id = req.params.dojang_id;
        let pageNum = req.query.page; // 요청 페이지 넘버
        let offset = 0;
        if(pageNum > 1){
            offset = 10 * (pageNum - 1);
        }
        try{
            if(req.role=="KWANJANG"){
                const data = await models.Class.findAndCountAll({
                    where: {
                        dojang: dojang_id
                    },
                    attributes: ['title', 'id']
                })
                res.send(data);
            }else if(req.role=="SABUM"){
                const sabum_id = await models.Sabum.findOne({where:{user:req.id},raw:true, attributes:["id"]})
                console.log(sabum_id)
                const data = await models.SabumClass.findAll({
                    where: {
                        sabum: sabum_id.id
                    },
                    raw:true,
                    attributes: ['class']
                })
                console.log("^^======>", data)
                temp = data.map(el=> el.class)
                console.log(temp)
                const data2 = await models.Class.findAndCountAll({
                    where: {
                        id: temp
                    },
                    raw:true,
                    attributes: ['title', 'id']
                })
                res.send(data2);
            }
        
        }
        catch(err){
            await res.status(500).send({
                message:
                    err.message || "some error occured"
            })
        }
    },

    ClassUpdate: async (req,res) => {
        /* #swagger.description = "반을 수정합니다."<br />
        mon_time 등 시간 입력시 ex) 12:00~13:00 처럼 "시작시간~끝나는시간"의 포맷 필요
        */
        // #swagger.tags = ["반"]
        // #swagger.summary = "반 수정"
        const data = req.body;
        const class_id = req.params.class_id;
        await models.Class.update(
        { 
            time: data.time,
            title: data.title,
            room: data.room,
            kwanjang: data.kwanjang,
            dojang: data.dojang,
            mon_time: data.mon_time,
            tue_time: data.tue_time,
            wed_time: data.wed_time,
            thu_time: data.thu_time,
            fri_time: data.fri_time,
            sat_time: data.sat_time,
            sun_time: data.sun_time
        },
        {
            where : { id: class_id }
        } 
        ).then(() =>{
            res.send("Class successfully updated")
        }).catch(err => {
            console.error(err);
        })
    },

    ClassRelateUpdate: async (req,res) => {
        // #swagger.description = "반과 관련된 정보를 수정합니다. "
        // #swagger.tags = ["반"]
        // #swagger.summary = "반 관련 정보 수정(수정 필요)"
        const data = req.body;
        const class_id = req.params.class_id;
        try{
            await models.Class.update(
                {
                    where : { id: class_id }
                },
                { 
                    time: data.time,
                    title: data.title,
                    room: data.room,
                    kwanjang: data.kwanjang,
                    dojang: data.dojang,
                    mon_time: data.mon_time,
                    tue_time: data.tue_time,
                    wed_time: data.wed_time,
                    thu_time: data.thu_time,
                    fri_time: data.fri_time,
                    sat_time: data.sat_time,
                    sun_time: data.sun_time
                },
            ) 
            res.send("Class successfully updated")
        }
        catch(err){
            res.status(500).send({
                message:
                    err.message || "some error occured"
            })
        }
    },
    
    ClassDelete: async (req,res) => {
        // #swagger.description = "반을 지웁니다."
        // #swagger.tags = ["반"]
        // #swagger.summary = "반 삭제"
        try{
            const class_id = req.params.class_id;
            await models.Class.destroy(
                {
                    where : { id: class_id }
                }
            ) 
            res.send("Class successfully deleted")
        }   
        catch(err){
            res.status(500).send({
                message:
                    err.message || "some error occured"
            })
        }
    },

    NoticeCreate: async (req,res) => {
        // #swagger.description = "날짜, 반 정보를 받아 공지를 생성합니다."
        // #swagger.tags = ["공지"]
        // #swagger.summary = "공지 생성"
        try{
            let FILE_img = req.files['img'];
            let FILE_vid = req.files['vid'];
            let FILE_doc = req.files['doc'];
            console.log(FILE_img,"FILE_img")

            let photo_url = []
            let video_url = []
            let doc_url = []
            let doc_FileName = []
            let dojang_id = req.params.dojang_id
            let { class_arr, title, contents, FileName} = req.body;
            if(await models.Notice.findOne({
                where: {
                    title: title,
                    contents: contents
                },
                raw: true
            })){return res.send("data exist!!!!")}
            //img
            if(FILE_img){
                for ( var i = 0; i < FILE_img.length; i++){
                    let imageName = generateFileName();
                    if(await models.UrlGroup.findOne({
                        where: {urls:"notice/img/"+imageName}
                    })){imageName = generateFileName();}
                    imageName = "notice/img/"+imageName
                    await models.UrlGroup.create({urls:imageName}) //url group에 늘리기
                    await uploadFile(FILE_img[i].buffer, imageName, FILE_img[i].mimetype)
                    photo_url.push(imageName)
                }
            }
            //vid
            if(FILE_vid){
                for ( var i = 0; i < FILE_vid.length; i++){
                    let imageName = generateFileName();
                    if(await models.UrlGroup.findOne({
                        where: {urls:"notice/vid/"+imageName}
                    })){imageName = generateFileName();}
                    imageName = "notice/vid/"+imageName
                    await models.UrlGroup.create({urls:imageName}) //url group에 늘리기
                    await uploadFile(FILE_vid[i].buffer, imageName, FILE_vid[i].mimetype)
                    video_url.push(imageName)
                }
            }
            //doc
            if(FILE_doc){
                for ( var i = 0; i < FILE_doc.length; i++){
                    let imageName = generateFileName();
                    if(await models.UrlGroup.findOne({
                        where: {urls:"notice/doc/"+imageName}
                    })){imageName = generateFileName();}
                    imageName = "notice/doc/"+imageName
                    await models.UrlGroup.create({urls:imageName}) //url group에 늘리기
                    await uploadFile(FILE_doc[i].buffer, imageName, FILE_doc[i].mimetype)
                    doc_url.push(imageName)
                    doc_FileName.push(FILE_doc[i].originalname)
                }
            }
            photo_url = JSON.stringify(photo_url)
            video_url = JSON.stringify(video_url)
            doc_url = JSON.stringify(doc_url)
            doc_FileName = JSON.stringify(doc_FileName)
            console.log(doc_FileName,"doc_FileName")
            if(photo_url.length == 2){
                photo_url = null
            }
            if(video_url.length == 2){
                video_url = null
            }
            if(doc_url.length == 2){
                doc_url = null
            }
            if(doc_FileName.length == 2){
                doc_FileName = null
            }
            await models.Notice.create({ title, contents, img_url: photo_url, 
                vid_url: video_url, doc_url: doc_url, FileName:doc_FileName})
            
            const notice_id = await models.Notice.findOne({
                where: {
                    title: title,
                    contents: contents
                },
                raw: true
            })

            class_arr= JSON.parse(class_arr)
            arr_len = class_arr.length;

            let dojang_info = await models.Dojang.findOne({
                where: {id: dojang_id},
                attributes:['name'],
                raw:true
            })
            dojang_name = dojang_info.name
            let notice_title = ` ${dojang_name}도장 공지 생성 알림`
            let notice_body = `${title}`

            //전체 공지
            if(arr_len == 0){
                await models.ClassNotice.create({class:null,notice:notice_id.id,dojang:dojang_id})
                //앱 푸쉬
                let user_id = []
                //앱 푸쉬 할 관장 ID 모으고
                let kwanjangdojang_info = await models.KwanjangDojang.findAll({
                    where: {dojang: dojang_id},
                    attributes: ['kwanjang'],
                    raw:true
                })
                for(let kwanjangdojang_one of kwanjangdojang_info){
                    let kwanjang_info = await models.KwanjangInfo.findOne({
                        where:{id: kwanjangdojang_one.kwanjang},
                        attributes: ['user'],
                        raw:true
                    })
                    if(kwanjang_info.user){
                        user_id.push(kwanjang_info.user)
                    }
                }
                //앱 푸쉬 할 사범 ID 모으고
                let sabumdojang_info = await models.SabumDojang.findAll({
                    where: {dojang: dojang_id},
                    attributes: ['sabum'],
                    raw:true
                })
                for(let sabumdojang_one of sabumdojang_info){
                    let sabum_info = await models.Sabum.findOne({
                        where:{id: sabumdojang_one.sabum},
                        attributes: ['user'],
                        raw:true
                    })
                    if(sabum_info.user){
                        user_id.push(sabum_info.user)
                    }
                }
                //앱 푸쉬 할 학부모 ID 모으고
                let student_info = await models.StudentInfo.findAll({
                    where: {dojang: dojang_id},
                    attributes: ['id','user'],
                    raw:true
                })
                for(let student_one of student_info){
                    let parentsstudent_info = await models.ParentsStudents.findAll({
                        where: {student:student_one.id},
                        attributes:['parents'],
                        raw:true
                    })
                    for(let parentsstudent_one of parentsstudent_info){
                        let parents_info = await models.ParentsInfo.findOne({
                            where: {id: parentsstudent_one.parents},
                            attributes: ['user'],
                            raw:true
                        })
                        if(parents_info.user){
                            user_id.push(parents_info.user)
                        }
                    }
                }
                //앱 푸쉬 할 수련생 ID 모으고
                for(let student_one of student_info){
                    if(student_one.user){
                        user_id.push(student_one.user)
                    }
                }
                // console.log(user_id,"user_id")
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
                    tokens = tokens.map(el=>el.fcm_token)
                    // console.log(tokens,"tokens")
                    sendGroup(tokens, notice_title, notice_body)
                }
                
            }
            //반 공지
            else{
                for(i=0;i<arr_len;i++){
                    //앱 푸쉬
                    let user_id = []
                    //앱 푸쉬 할 관장 ID 모으고
                    let kwanjangdojang_info = await models.KwanjangDojang.findAll({
                        where: {dojang: dojang_id},
                        attributes: ['kwanjang'],
                        raw:true
                    })
                    for(let kwanjangdojang_one of kwanjangdojang_info){
                        let kwanjang_info = await models.KwanjangInfo.findOne({
                            where:{id: kwanjangdojang_one.kwanjang},
                            attributes: ['user'],
                            raw:true
                        })
                        if(kwanjang_info.user){
                            user_id.push(kwanjang_info.user)
                        }
                    }
                    //앱 푸쉬 할 사범 ID 모으고
                    let instructorclass_info = await models.InstructorClass.findAll({
                        where: {class: class_arr[i], kwanjang: null},
                        attributes: ['sabum'],
                        raw:true
                    })
                    for(let instructorclass_one of instructorclass_info){
                        let sabum_info = await models.Sabum.findOne({
                            where:{id: instructorclass_one.sabum},
                            attributes: ['user'],
                            raw:true
                        })
                        if(sabum_info.user){
                            user_id.push(sabum_info.user)
                        }
                    }
                    //앱 푸쉬 할 학부모 ID 모으고
                    let classstudent_info = await models.ClassStudent.findAll({
                        where: {class: class_arr[i]},
                        attributes: ['student'],
                        raw: true
                    })
                    for(let classstudent_one of classstudent_info){
                        let parentsstudent_info = await models.ParentsStudents.findAll({
                            where: {student:classstudent_one.student},
                            attributes:['parents'],
                            raw:true
                        })
                        for(let parentsstudent_one of parentsstudent_info){
                            let parents_info = await models.ParentsInfo.findOne({
                                where: {id: parentsstudent_one.parents},
                                attributes: ['user'],
                                raw:true
                            })
                            if(parents_info.user){
                                user_id.push(parents_info.user)
                            }
                        }
                    }
                    //앱 푸쉬 할 수련생 ID 모으고
                    for(let classstudent_one of classstudent_info){
                        if(classstudent_one.parents){
                            user_id.push(classstudent_one.parents)
                        }
                    }
                    console.log(user_id,"user_id")
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
                    tokens = tokens.map(el=>el.fcm_token)
                    // return res.send(user_id)
                    sendGroup(tokens, notice_title, notice_body)
                    await models.ClassNotice.create({class:class_arr[i],notice:notice_id.id,dojang:dojang_id})
                }
            }

            res.send("Notice Successfully created")
        }   
        catch(err){
            res.status(500).send({
                message:
                    err.message || "some error occured"
            })
        }
    },

    NoticeReadOne: async (req, res, next) => {
        /* #swagger.description = "하나의 공지를 조회합니다 <br />
        모바일 전용 api 입니다 <br />
        "
        */
        // #swagger.tags = ["공지"]
        // #swagger.summary = "공지 하나 조회"
        
        try{
            let notice_id = req.params.notice_id;
            let {student_user_id} = req.body
            
            let notice_info = await models.Notice.findOne({
                where: {id: notice_id},
                raw:true
            })
            if(!notice_info){
                return res.send("notice not exist")
            }
            let notice_reply_info = await models.NoticeReply.findAll({
                where: {notice: notice_id},
                raw:true
            })
            for(let notice_reply_one of notice_reply_info){
                let useraccount_info = await models.UserAccount.findOne({
                    where: {id:notice_reply_one.user},
                    attributes: ['id','role'],
                    raw:true
                })
                if(useraccount_info.role == 'KWANJANG'){
                    let kwanjang_info = await models.KwanjangInfo.findOne({
                        where: {user: useraccount_info.id},
                        raw:true
                    })
                    notice_reply_one['last_name'] = kwanjang_info.last_name
                    notice_reply_one['first_name'] = kwanjang_info.first_name
                    notice_reply_one['role'] = "관장"
                }
                else if(useraccount_info.role == 'SABUM'){
                    let sabum_info = await models.Sabum.findOne({
                        where: {user: useraccount_info.id},
                        raw:true
                    })
                    notice_reply_one['last_name'] = sabum_info.last_name
                    notice_reply_one['first_name'] = sabum_info.first_name
                    notice_reply_one['role'] = "사범"
                }
                else if(useraccount_info.role == 'STUDENT'){
                    let student_info = await models.StudentInfo.findOne({
                        where: {user: useraccount_info.id},
                        raw:true
                    })
                    notice_reply_one['last_name'] = student_info.last_name
                    notice_reply_one['first_name'] = student_info.first_name
                    notice_reply_one['role'] = "수련생"
                }
                else if(useraccount_info.role == 'FAMILY'){
                    console.log(notice_reply_one,"notice_reply_one")
                    let student_info = await models.StudentInfo.findOne({
                        where: {user : notice_reply_one.student_useraccount_id},
                        raw:true
                    })
                    let parents_info = await models.ParentsInfo.findOne({
                        where: {user: useraccount_info.id},
                        raw:true
                    })
                    console.log(student_info.id,"student_info.id")
                    console.log(parents_info.id,"parents_info.id")
                    let parentsstudents_info = await models.ParentsStudents.findOne({
                        where: {student : student_info.id, parents:parents_info.id},
                        attributes: ['relation'],
                        raw:true
                    })
                    
                    notice_reply_one['last_name'] = student_info.last_name
                    notice_reply_one['first_name'] = student_info.first_name
                    notice_reply_one['role'] = parentsstudents_info.relation
                }
            }
            console.log(notice_reply_info,"notice_reply_info")
            
            if(notice_reply_info){
                notice_info['reply_info'] = notice_reply_info
            }
            res.send(notice_info)
        }
        catch(err){
            await res.status(500).send({
                message:
                    err.message || "some error occured"
            })
        }
    },

    NoticeReadApp: async (req, res, next) => {
        /* #swagger.description = "모든 공지를 조회합니다 <br />
        모바일 전용 api 입니다 <br />
        전체 공지와 일반공지로 나누어 조회 합니다 <br />
        "
        */
        // #swagger.tags = ["공지"]
        // #swagger.summary = "공지 조회"
        
        dojang_id = req.params.dojang_id;
        class_id = req.params.class_id;
        year = req.params.year;
        month = req.params.month;
        try{
            if (!await models.Dojang.findOne({
                where : {id : dojang_id}
            })){return res.send("dojang_id not exist")}
            
            // notice_info = await 
            // 도장에 해당되는 모든 notice 의 수 구하기,
            // 도장에 있는 모든 반 구하기
            // 전체 공지 = 해당 notice 일때 모든 반 수와 일치하면
            // 아니라면 일부 공지 
            let result_obj = new Object
            let notice_arr = []
            let notice_data_arr = []

            let dojang_info = await models.Dojang.findOne({
                where: {id: dojang_id},
                attributes: ['name','logo_img'],
                raw: true
            })
            //전체 공지
            if(class_id == 0){
                let notice_info = await models.ClassNotice.findAll({
                    where:{
                        dojang: dojang_id,
                        createdAt: sequelize.where(sequelize.fn('YEAR', sequelize.col('createdAt')), year),
                        [Op.and]: sequelize.where(sequelize.fn('MONTH', sequelize.col('createdAt')), month)
                    },
                    raw:true,
                    attributes: ['class','notice','createdAt'],
                    group: "ClassNotice.notice",
                    order: [['createdAt','desc']],
                })
                console.log(notice_info,"notice_info")
                for(let el of notice_info){
                    console.log(el,"el")
                    el.createdAt = JSON.stringify(el.createdAt).slice(1,-1)
                    el.createdAt = el.createdAt.split('T')[0]

                    if(el.class == null){
                        notice_arr.push(el)
                    }
                    //해당 공지의 반의 수 정보
                    //총 공지의 수 정보
                    
                }
                for(let notice of notice_arr){
                    
                    console.log(notice,"notice")
                    
                    let notice_info=await models.Notice.findOne({
                        where: {id:notice.notice},
                        attributes: ['id','title','contents','createdAt'],
                        raw:true,
                        order: [['createdAt','desc']],
                    })
                    notice_info.createdAt = JSON.stringify(notice_info.createdAt).slice(1,-1)
                    notice_info.createdAt = notice_info.createdAt.split('T')[0]
                    
                    //댓글
                    let reply_info = await models.NoticeReply.findAndCountAll({
                        where: {notice: notice.notice},
                        attributes: ['user'],
                        raw:true
                    })
                    notice_info["reply_count"] = reply_info.count
                    notice_data_arr.push(notice_info)
                }
                result_obj["dojang_name"] = dojang_info.name
                result_obj["dojang_logo"] = dojang_info.logo_img
                result_obj["entire"] = notice_data_arr
            }
            else if(class_id != 0){
                // //전체 공지
                let class_info = await models.Class.findOne({
                    where: {id: class_id},
                    attributes: ['title']
                })
                // let classnotice_info = await models.ClassNotice.findAll({
                //     where:{
                //         class: null,
                //         dojang: dojang_id,
                //         createdAt: sequelize.where(sequelize.fn('YEAR', sequelize.col('createdAt')), year),
                //         [Op.and]: sequelize.where(sequelize.fn('MONTH', sequelize.col('createdAt')), month)
                //     },
                //     raw:true,
                //     attributes: ['class','notice','createdAt'],
                //     group: "ClassNotice.notice"
                // })
                // let entire_arr = []
                // for(let classnotice_one of classnotice_info){
                //     let entire_info = await models.Notice.findOne({
                //         where: {id: classnotice_one.notice},
                //         attributes: ['id','title','contents','createdAt'],
                //         raw: true
                //     })
                //     let notice_reply_info = await models.NoticeReply.findAll({
                //         where: {notice: classnotice_one.notice},
                //         attributes: ['user'],
                //         raw:true
                //     })
                //     entire_info['reply_count'] = notice_reply_info.length 
                //     entire_arr.push(entire_info)
                // }

                //반공지
                let notice_info = await models.ClassNotice.findAll({
                    where:{
                        class: class_id,
                        dojang: dojang_id,
                        createdAt: sequelize.where(sequelize.fn('YEAR', sequelize.col('createdAt')), year),
                        [Op.and]: sequelize.where(sequelize.fn('MONTH', sequelize.col('createdAt')), month)
                    },
                    raw:true,
                    attributes: ['class','notice','createdAt'],
                    group: "ClassNotice.notice"
                })
                // console.log(notice_info,"notice_info")
                for(let el of notice_info){
                    console.log(el,"el")
                    notice_arr.push(el)
                    //해당 공지의 반의 수 정보
                    //총 공지의 수 정보
                    
                }
                for(let notice of notice_arr){
                    console.log(notice,"notice")
                    let notice_info=await models.Notice.findOne({
                        where: {id:notice.notice},
                        attributes: ['id','title','contents','createdAt'],
                        raw:true
                    })
                    notice_info.createdAt = JSON.stringify(notice_info.createdAt).slice(1,-1)
                    notice_info.createdAt = notice_info.createdAt.split('T')[0]
                    
                    //댓글
                    let reply_info = await models.NoticeReply.findAndCountAll({
                        where: {notice: notice.notice},
                        attributes: ['user'],
                        raw:true
                    })
                    notice_info["reply_count"] = reply_info.count
                    notice_data_arr.push(notice_info)
                }
                result_obj["dojang_name"] = dojang_info.name
                result_obj["dojang_logo"] = dojang_info.logo_img
                result_obj["class_title"] = class_info.title
                // result_obj["entire_info"] = entire_arr
                result_obj["notice_info"] = notice_data_arr
            }
            res.send(result_obj)
            }
        catch(err){
            await res.status(500).send({
                message:
                    err.message || "some error occured"
            })
        }
    },

    NoticeClassRead: async (req, res, next) => {
        /* #swagger.description = "최신 공지 5개를 조회합니다 <br />
        "
        */
        // #swagger.tags = ["공지"]
        // #swagger.summary = "공지 최신 조회"
        
        try{
            const auth_id = req.id
            const auth_role = req.role
            const dojang_id = req.params.dojang_id

            console.log(auth_id,"auth_id")

            let class_arr = []

            if(auth_role == 'KWANJANG'){
                const class_info = await models.Class.findAll({
                    where: {dojang: dojang_id},
                    attributes: ['id','title'],
                    raw:true
                })
                return res.send(class_info)
            }
            else if(auth_role == 'SABUM'){
                const sabum_info = await models.Sabum.findOne({
                    where: {user: auth_id},
                    attributes: ['id'],
                    raw:true
                })
                const sabumclass_info = await models.SabumClass.findAll({
                    where: {sabum: sabum_info.id},
                    attributes: ['class'],
                    raw:true
                })
                for(let sabumclass_one of sabumclass_info){
                    class_info = await models.Class.findOne({
                        where: {id: sabumclass_one.class},
                        attributes: ['id','title'],
                        raw:true
                    })
                    class_arr.push(class_info)
                }
                return res.send(class_arr)
            }
        }
        catch(err){
            await res.status(500).send({
                message:
                    err.message || "some error occured"
            })
        }
    },

    NoticeReadRecentApp: async (req, res, next) => {
        /* #swagger.description = "최신 공지 5개를 조회합니다 <br />
        모바일 전용 api 입니다 <br />
        "
        */
        // #swagger.tags = ["공지"]
        // #swagger.summary = "공지 최신 조회"
        
        try{
            const dojang_id = req.params.dojang_id
            const class_id = req.params.class_id
            let result_5_array = []
            let notice_arr = []

            let classnotice_info = await models.ClassNotice.findAll({
                where: {
                    dojang: dojang_id,
                    [Op.or]: [{class:class_id},{class:null}]
                },
                attributes: ['notice','class'],
                group: "ClassNotice.notice",
                order: [['createdAt', 'desc']],
                raw:true
            })
            for(let classnotice_one of classnotice_info){
                let notice_one = await models.Notice.findOne({
                    where: {id: classnotice_one.notice},
                    raw:true
                })
                if(classnotice_one.class==null){
                    notice_one['type'] = "entire" 
                }
                else{
                    notice_one['type'] = "class"
                }
                notice_arr.push(notice_one)
            }
            for(i=0;i<5;i++){
                result_5_array.push(notice_arr[i])
            }
            
            return res.send(result_5_array)
        }
        catch(err){
            await res.status(500).send({
                message:
                    err.message || "some error occured"
            })
        }
    },

    NoticeReadAll: async (req, res, next) => {
        /* #swagger.description = "모든 공지를 조회합니다 <br />
        전체공지는 class의 값이 +entire+ -> 따옴표를 쓸수가 없어서 +로 대신합니다 <br />
        일부 공지는 class의 값이 [1,3,5] <br />
        "
        */
        // #swagger.tags = ["공지"]
        // #swagger.summary = "공지 조회"
        
        dojang_id = req.params.dojang_id;

        try{
            if (!await models.Dojang.findOne({
                where : {id : dojang_id}
            })){return res.send("dojang_id exist")}
            let query = `
                        SELECT CN.notice, N.title, N.createdAt FROM Notices AS N
                        INNER JOIN ClassNotices AS CN
                        ON CN.notice=N.id
                        WHERE CN.dojang=${dojang_id}
                        GROUP BY CN.notice
                        `
            const notice_info = await sequelize.query(query, 
                {
                    type: Sequelize.QueryTypes.SELECT, 
                    raw: true   
                });
            console.log(notice_info,"notice_info")
            // 도장에 해당되는 모든 notice 의 수 구하기,
            // 도장에 있는 모든 반 구하기
            // 전체 공지 = 해당 notice 일때 모든 반 수와 일치하면
            // 아니라면 일부 공지 
            for(let el of notice_info){
                el.createdAt = JSON.stringify(el.createdAt).slice(1,-1)
                el.createdAt = el.createdAt.split('T')[0]
                CN = await models.ClassNotice.findAndCountAll({
                    where: {notice: el["notice"]},
                    raw:true,
                    attributes: ['class','dojang']
                })
                console.log(CN.rows[0]['class'],"222")
                if(CN.rows[0]['class'] == null){
                    el["class"] = "entire"
                }else{
                    let temp = []
                    CN.rows.forEach(el=>{
                        temp.push(el.class)
                    })
                    el["class"] = temp
                }
                
            }
            
            res.send(notice_info)
            }
        catch(err){
            await res.status(500).send({
                message:
                    err.message || "some error occured"
            })
        }
    },

    NoticeReadByClass: async (req, res, next) => {
        // #swagger.description = "날짜 정보와 반정보를 받아 공지을 조회합니다. id가 0이면 모두 검색, 0이 아닐 시 해당 id만 검색합니다."
        // #swagger.tags = ["공지"]
        // #swagger.summary = "공지 조회"
        
        class_id = req.params.class_id;
        date = req.params.date;
        try{
            if (class_id != 0) { // id 0이 아닐 때 하나 찾기
                const data = await models.Notice.findAll({
                    where: sequelize.where(sequelize.fn('date',sequelize.col('Notice.createdAt')), '=', date),
                    include: [
                        {
                            model: models.Class,
                            through: {
                                where: {class: class_id},
                            },
                            attributes: ['id']
                        }
                    ],
                    attributes: {
                        include: [
                            [sequelize.fn('date_format', sequelize.col('Notice.createdAt'), '%Y-%m-%d'), 'createdAt'],
                            [sequelize.fn('date_format', sequelize.col('Notice.updatedAt'), '%Y-%m-%d'), 'updatedAt'],
                        ],
                    },
                    raw : true
                })
                // console.log(data,'@@@')
                data.forEach(el=>el['Classes.ClassNotices.createdAt'] = el['Classes.ClassNotices.createdAt'].toISOString().split('T')[0])
                data.forEach(el=>el['Classes.ClassNotices.updatedAt'] = el['Classes.ClassNotices.updatedAt'].toISOString().split('T')[0])
                
                res.send(data);
            }
            else if(class_id == 0){ // id == 0 이면 모두 찾기
                const data = await models.Notice.findAll({
                    where: sequelize.where(sequelize.fn('date',sequelize.col('Notice.createdAt')), '=', date),
                    attributes: {
                        include: [
                            [sequelize.fn('date_format', sequelize.col('Notice.createdAt'), '%Y-%m-%d'), 'createdAt'],
                            [sequelize.fn('date_format', sequelize.col('Notice.updatedAt'), '%Y-%m-%d'), 'updatedAt'],
                        ],
                    },
                })
                res.send(data);
            }
            
        }
        catch(err){
            await res.status(500).send({
                message:
                    err.message || "some error occured"
            })
        }
    },

    NoticeReadByNotice: async (req, res, next) => {
        // #swagger.description = "날짜 정보와 공지ID를 받아 공지를 조회합니다. id가 0이면 모두 검색, 0이 아닐 시 해당 id만 검색합니다."
        // #swagger.tags = ["공지"]
        // #swagger.summary = "공지 조회"
        
        notice_id = req.params.notice_id;
        date = req.params.date;
        try{
            const data = await models.Notice.findAll({
                where: sequelize.where(sequelize.fn('date',sequelize.col('Notice.createdAt')), '=', date),
                include: [{
                    model:models.Class,
                    required: true,
                    through: {
                        where: {notice:notice_id},
                        attributes: []
                    },
                    attributes: ["id","title"]
                }],
                attributes: ["id","title","contents","img_url","vid_url","doc_url"]
            })
            res.send(data);
        }
        catch(err){
            await res.status(500).send({
                message:
                    err.message || "some error occured"
            })
        }
    },

    NoticeUpdateByNotice: async (req, res, next) => {
        // #swagger.description = "날짜 정보와 공지ID를 받아 공지을 수정합니다."
        // #swagger.tags = ["공지"]
        // #swagger.summary = "공지 수정"
        const notice_id = req.params.notice_id
        try{
            console.log(req.files,"req.files")
            console.log(req.body,"req.body")
            let FILE_img = req.files['img'];
            let FILE_vid = req.files['vid'];
            let FILE_doc = req.files['doc'];
            let photo_url = []
            let video_url = []
            let doc_url = []
            let { title, contents, delImgname, delVidname, delDocname} = req.body;
                
            //기존 파일들 뽑아냄
            defaultPhoto = await models.Notice.findOne({
                where: {id:notice_id},
                attributes: ['img_url','vid_url','doc_url'],
                raw: true
            })

            // img
            //해당 키의 파일이 있을때만 실행
            if(FILE_img){
                //원래 파일이 있으면 지우고 원래 파일 가공
                if(defaultPhoto.img_url){
                    if(delImgname){
                        default_img = JSON.parse(defaultPhoto.img_url)
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
                    // photo_url = JSON.parse(photo_url)
                }
                //원래 파일이 없다면 빈 배열 부여
                if(!photo_url){
                    photo_url = []
                }
                //받은 파일이 있으니 파일 생성
                for ( var i = 0; i < FILE_img.length; i++){
                    let imageName = generateFileName();
                    if(await models.UrlGroup.findOne({
                        where: {urls:"notice/img/"+imageName}
                    })){imageName = generateFileName();}
                    imageName = "notice/img/"+imageName
                    await models.UrlGroup.create({urls:imageName}) //url group에 늘리기
                    await uploadFile(FILE_img[i].buffer, imageName, FILE_img[i].mimetype)
                    photo_url.push(imageName)
                }
                //저장을 위한 문자화
                photo_url = JSON.stringify(photo_url)
                //따로 따로 업데이트
                if(photo_url.length == 2){
                    await models.Notice.update(
                        {
                            img_url : null
                        },
                        {
                            where: {id : notice_id}
                        }
                        
                    )
                }
                else{
                    await models.Notice.update(
                        {
                            img_url:photo_url, 
                        },
                        {
                            where: {id : notice_id}
                        }
                        
                    )
                }
            }
            else if(delImgname){
                default_img = JSON.parse(defaultPhoto.img_url)
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
                photo_url = default_img
                //저장을 위한 문자화
                photo_url = JSON.stringify(photo_url)
                //따로 따로 업데이트
                if(photo_url.length == 2){
                    await models.Notice.update(
                        {
                            img_url : null
                        },
                        {
                            where: {id : notice_id}
                        }
                        
                    )
                }
                else{
                    await models.Notice.update(
                        {
                            img_url:photo_url, 
                        },
                        {
                            where: {id : notice_id}
                        }
                        
                    )
                }
            }
            //vid
            //해당 키의 파일이 있을때만 실행
            if(FILE_vid){
                //원래 파일이 있으면 지우고 원래 파일 가공
                if(defaultPhoto.vid_url){
                    default_vid = JSON.parse(defaultPhoto.vid_url)
                    console.log("default_img")
                    if(delVidname){
                        delVidname= JSON.parse(delVidname)
                        for(let del of delVidname){
                            for(let i=0; i< default_vid.length; i++){
                                if(del == default_vid[i]){
                                    await deleteFile(default_vid[i]),
                                    await models.UrlGroup.destroy({ //url group에서 삭제하기
                                        where: {urls: default_vid[i]}
                                    })
                                    default_vid.splice(i, 1); 
                                    i--; 
                                }
                            }
                        }
                    }
                    video_url = default_vid
                    // video_url = JSON.parse(video_url)
                }
                //원래 파일이 없다면 빈 배열 부여
                if(!video_url){
                    video_url = []
                }
                //받은 파일이 있으니 파일 생성
                for ( var i = 0; i < FILE_vid.length; i++){
                    let imageName = generateFileName();
                    if(await models.UrlGroup.findOne({
                        where: {urls:"notice/vid/"+imageName}
                    })){imageName = generateFileName();}
                    imageName = "notice/vid/"+imageName
                    await models.UrlGroup.create({urls:imageName}) //url group에 늘리기
                    await uploadFile(FILE_vid[i].buffer, imageName, FILE_vid[i].mimetype)
                    video_url.push(imageName)
                }
                //저장을 위한 문자화
                video_url = JSON.stringify(video_url)
                //따로 따로 업데이트
                if(vid_url.length == 2){
                    await models.Notice.update(
                        {vid_url : null},
                        {where: {id : notice_id}}
                    )
                }
                else{
                    await models.Notice.update(
                        {vid_url:video_url,},
                        {where: {id : notice_id}}
                    )
                }
            }
            else if(delVidname){
                default_vid = JSON.parse(defaultPhoto.vid_url)
                delVidname= JSON.parse(delVidname)
                for(let del of delVidname){
                    for(let i=0; i< default_vid.length; i++){
                        if(del == default_vid[i]){
                            await deleteFile(default_vid[i]),
                            await models.UrlGroup.destroy({ //url group에서 삭제하기
                                where: {urls: default_vid[i]}
                            })
                            default_vid.splice(i, 1); 
                            i--; 
                        }
                    }
                }
                vid_url = default_vid
                //저장을 위한 문자화
                vid_url = JSON.stringify(vid_url)
                //따로 따로 업데이트
                if(vid_url.length == 2){
                    await models.Notice.update(
                        {vid_url : null},
                        {where: {id : notice_id}}
                    )
                }
                else{
                    await models.Notice.update(
                        {vid_url:vid_url, },
                        {where: {id : notice_id}}
                    )
                }
            }
            //doc
            //해당 키의 파일이 있을때만 실행
            if(FILE_doc){
                //원래 파일이 있으면 지우고 원래 파일 가공
                if(defaultPhoto.doc_url){
                    default_doc = JSON.parse(defaultPhoto.doc_url)
                    console.log("default_img")
                    if(delDocname){
                        delDocname= JSON.parse(delDocname)
                        for(let del of delDocname){
                            for(let i=0; i< default_doc.length; i++){
                                if(del == default_doc[i]){
                                    await deleteFile(default_doc[i]),
                                    await models.UrlGroup.destroy({ //url group에서 삭제하기
                                        where: {urls: default_doc[i]}
                                    })
                                    default_doc.splice(i, 1); 
                                    i--; 
                                }
                            }
                        }
                    }
                    doc_url = default_doc
                    // doc_url = JSON.parse(doc_url)
                }
                //원래 파일이 없다면 빈 배열 부여
                if(!doc_url){
                    doc_url = []
                }
                //받은 파일이 있으니 파일 생성
                for ( var i = 0; i < FILE_doc.length; i++){
                    let imageName = generateFileName();
                    if(await models.UrlGroup.findOne({
                        where: {urls:"notice/doc/"+imageName}
                    })){imageName = generateFileName();}
                    imageName = "notice/doc/"+imageName
                    await models.UrlGroup.create({urls:imageName}) //url group에 늘리기
                    await uploadFile(FILE_doc[i].buffer, imageName, FILE_doc[i].mimetype)
                    doc_url.push(imageName)
                }
                //저장을 위한 문자화
                doc_url = JSON.stringify(doc_url)
                //따로 따로 업데이트
                if(doc_url.length == 2){
                    await models.Notice.update(
                        {
                            doc_url : null
                        },
                        {
                            where: {id : notice_id}
                        }
                        
                    )
                }
                else{
                    await models.Notice.update(
                        {
                            doc_url
                        },
                        {
                            where: {id : notice_id}
                        }
                    )
                }
            }
            else if(delDocname){
                default_doc = JSON.parse(defaultPhoto.doc_url)
                delDocname= JSON.parse(delDocname)
                for(let del of delDocname){
                    for(let i=0; i< default_doc.length; i++){
                        if(del == default_doc[i]){
                            await deleteFile(default_doc[i]),
                            await models.UrlGroup.destroy({ //url group에서 삭제하기
                                where: {urls: default_doc[i]}
                            })
                            default_doc.splice(i, 1); 
                            i--; 
                        }
                    }
                }
                doc_url = default_doc
                //저장을 위한 문자화
                doc_url = JSON.stringify(doc_url)
                //따로 따로 업데이트
                if(doc_url.length == 2){
                    await models.Notice.update(
                        {doc_url : null},
                        {where: {id : notice_id}}
                    )
                }
                else{
                    await models.Notice.update(
                        {doc_url:doc_url},
                        {where: {id : notice_id}}
                    )
                }
            }
            //data
            await models.Notice.update(
                {
                    title, contents
                },
                {
                    where: {id : notice_id}
                }
            )
            await models.ClassNotice.destroy({ 
                where: {notice: notice_id}
            })
            res.send("Notice Successfully updated")
        }   
        catch(err){
            res.status(500).send({
                message:
                    err.message || "some error occured"
            })
        }
    },

    NoticeDelete: async (req, res, next) => {
        // #swagger.description = "공지ID를 받아 공지을 삭제합니다"
        // #swagger.tags = ["공지"]
        // #swagger.summary = "공지 삭제"
        const notice_id = req.params.notice_id
        try{
            await models.NoticeReply.update(
                { 
                    notice: null
                },
                {
                    where: {notice: notice_id}
                }
            )
            await models.ClassNotice.destroy({ 
                where: {notice: notice_id}
            })
            await models.Notice.destroy({
                where: {id: notice_id}
            })
            res.send("Notice Successfully deleted")
        }   
        catch(err){
            res.status(500).send({
                message:
                    err.message || "some error occured"
            })
        }
    },

    NoticeReplyCreate: async (req, res, next) => {
        /* #swagger.description = "공지ID를 받아 댓글을 만듭니다.<br />
        작성자가 부모인 경우 student_useraccount_id에 학생의 useraccount ID를 입력해주셔야 합니다(댓글 작성자 관계명시를 위함)
        "
        */
        // #swagger.tags = ["공지"]
        // #swagger.summary = "공지 댓글 생성"
        
        try{
            const notice_id = req.params.notice_id
            const { contents, student_useraccount_id } = req.body
            await models.NoticeReply.create({
                notice: notice_id, user: req.id, contents, student_useraccount_id
            })
            res.send("NoticeReply Successfully created")
        }   
        catch(err){
            res.status(500).send({
                message:
                    err.message || "some error occured"
            })
        }
    },

    NoticeReplyRead: async (req, res, next) => {
        // #swagger.description = "공지ID를 받아 댓글을 조회"
        // #swagger.tags = ["공지"]
        // #swagger.summary = "공지 댓글 조회"
        
        try{
            const notice_id = req.params.notice_id
            let reply_info = await models.NoticeReply.findAll({
                where: {notice: notice_id},
                attributes: ['user','student_useraccount_id','contents','createdAt'],
                raw:true
            })
            console.log(reply_info,"reply_info")
            let reply_arr = []
            for (let reply of reply_info){
                let reply_user = new Object
                let user_info = await models.UserAccount.findOne({
                    where: {id: reply.user},
                    attributes: ['id','username','role']
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
                    let student_info = await models.StudentInfo.findOne({
                        where: {user: reply.student_useraccount_id},
                        attributes: ['id'],
                        raw:true
                    })
                    let parents_info = await models.ParentsInfo.findOne({
                        where: {user: reply.user},
                        attributes: ['id','last_name','first_name'],
                        raw: true
                    })
                    let parentsstudents_info = await models.ParentsStudents.findOne({
                        whre: {parents:parents_info.id,student:student_info.id},
                        attributes: ['relation']
                    })
                    reply["relation"]= parentsstudents_info.relation
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

    NoticeReplyDelete: async (req, res, next) => {
        // #swagger.description = "공지 ID를 받아 댓글을 삭제"
        // #swagger.tags = ["공지"]
        // #swagger.summary = "공지 댓글 삭제"
        
        try{
            const notice_reply_id = req.params.notice_reply_id

            let notice_reply_info = await models.NoticeReply.findOne({
                where: {id: notice_reply_id},
                raw:true
            })
            if(!notice_reply_info){
                return res.send("notice not exist")
            }
            await models.NoticeReply.update(
                {
                    notice: null
                },
                {
                    where: {id: notice_reply_id},
                }
            )
            res.send("notice successfully deleted")
        }   
        catch(err){
            res.status(500).send({
                message:
                    err.message || "some error occured"
            })
        }
    },
}
