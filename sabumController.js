const models = require("../models");
const Sequelize = require('sequelize');
const { sequelize } = require('../models')

const crypto = require("crypto");
const generateFileName = (bytes = 8) =>
    crypto.randomBytes(bytes).toString("hex");
const { uploadFile, deleteFile } = require("../util/s3.js");

const DEFAULT_PROFILE_URL = "student/default_profile.jpg"

module.exports = {
    // sabum    
    test:async (req, res) => {
        console.log(req.body)
        res.send(req.body);
    },
    SabumCreate: async (req, res) => {
        /* #swagger.description = "사범을 만듭니다. user column INTEGER necessary <br />
        <br />
        ***MEANING*** <br /><br />
        admission_year : 입학연도, <br />
        admission_month : 입학월(date of birth) <br />
        graduated_year : 졸업연도 <br />
        graduated_month : 졸업월 <br />
        major : 전공 <br />
        grades : 학점 <br />
        career : 태권도경력 <br />
        driver_license : 운전면허증(1종/2종 등) <br />
        driver_license_obtaining_year : 운전면허증 취득연도 <br />
        driver_license_obtaining_month : 운전면허증 취득월 <br />
        transfer_status : 편입여부<boolean> <br />
        graduated_status : 졸업여부(재학, 휴학, 졸업 등) <br />
        level : 품/단 <br />
        tkd_level_number : 품/단 일련번호 <br />
        instructor_license_grade : 사범자격증 급수 <br />
        instructor_license_number : 사법자격증 일련번호 <br />
        life_sports_instructor_grade : 생활체육지도자 급수 <br />
        life_sports_instructor_number : 생활체육지도자 일련번호 <br />
        address_name : 주소 <br />
        address_detail : 상세주소 <br />
        region_1depth_name : 시도 단위 주소 <br />
        region_2depth_name : 구 단위 주소 <br />
        region_3depth_name : 동 단위 주소 <br />
        region_3depth_h_name : 행정동 명칭 주소 <br />
        "
        */
        // #swagger.tags = ["사범"]
        // #swagger.summary = "사범 생성"
        try{
            let FILE = req.file;
            let photo_url = []
            const auth_id = req.id
            const auth_role = req.role
            if(auth_role != 'SABUM'){
                return res.send("you are not sabum")
            }
            let imageName = generateFileName();
            if(FILE){
                if(FILE.mimetype.split('/')[0]=="image"){
                    if(await models.UrlGroup.findOne({
                        where: {urls:"sabum/img/"+imageName}
                    })){imageName = generateFileName();}
                    imageName = "sabum/img/"+imageName
                    await models.UrlGroup.create({urls:imageName}) //url group에 늘리기
                    await uploadFile(FILE.buffer, imageName, FILE.mimetype)
                    photo_url.push(imageName)
                }
            }
            else{
                photo_url.push(DEFAULT_PROFILE_URL)
            }
            photo_url = JSON.stringify(photo_url).slice(2,-2)
            if(photo_url == ""){
                photo_url = null
            }
            let { sex, address_name, road_address, 
                region_1depth_name, region_2depth_name, region_3depth_name, 
                region_3depth_h_name, address_detail, country, dob, ssn, 
                language, dojang_reg_date, is_approved, admission_year, admission_month
                , graduated_year, graduated_month, school_name, major
                , grades, total_grades, career, driver_license, driver_license_obtaining_year
                , driver_license_obtaining_month, transfer_status, graduated_status
                , level, tkd_level_number, instructor_license_grade
                , instructor_license_number, life_sports_instructor_grade
                , life_sports_instructor_number, sabum_career_info, sabum_license_info,
                sabum_award_info} = req.body;
                if(grades>total_grades || grades < 0){
                    res.send("grades wrong number")
                }
            let useraccount_info = await models.UserAccount.findOne({
                where: {id: auth_id},
                attributes: ['last_name','first_name','email','phone_number'],
                raw:true
            })

            const sabum_temp = await models.Sabum.create({ first_name: useraccount_info.first_name, 
                last_name: useraccount_info.last_name, phone_number: useraccount_info.phone_number, 
                sex, address_name, road_address, region_1depth_name, region_2depth_name,
                region_3depth_name, region_3depth_h_name, address_detail,
                country, dob, ssn, photo_url : photo_url, email: useraccount_info.email, language, dojang_reg_date, is_approved,
                admission_year, admission_month, graduated_year, graduated_month, school_name
                , major, grades, total_grades, career, driver_license, driver_license_obtaining_year
                , driver_license_obtaining_month, transfer_status, graduated_status
                , level, tkd_level_number, instructor_license_grade
                , instructor_license_number, life_sports_instructor_grade
                , life_sports_instructor_number })
            
            if(sabum_career_info){
                sabum_career_info = JSON.parse(sabum_career_info)
                for(let sabum_career_one of sabum_career_info){
                    await models.SabumCareer.create({
                        sabum :sabum_temp.id,
                        dojang_name: sabum_career_one.dojang_name,
                        employment_start_year: sabum_career_one.employment_start_year,
                        employment_start_month: sabum_career_one.employment_start_month,
                        employment_end_year: sabum_career_one.employment_end_year,
                        employment_end_month: sabum_career_one.employment_end_month,
                    })
                }
            }
            if(sabum_license_info){
                sabum_license_info = JSON.parse(sabum_license_info)
                for(let sabum_license_one of sabum_license_info){
                    await models.SabumLicense.create({
                        sabum :sabum_temp.id,
                        license_grade: sabum_license_one.license_grade, 
                        license_name: sabum_license_one.license_name,  
                        license_number: sabum_license_one.license_number
                    })
                }
            }
            console.log(sabum_award_info,"sabum_award_info")
            if(sabum_award_info){
                sabum_award_info = JSON.parse(sabum_award_info)
                for(let sabum_award_one of sabum_award_info){
                    await models.SabumAward.create({
                        sabum :sabum_temp.id,
                        award_contents: sabum_award_one.award_contents, 
                        award_date: sabum_award_one.award_date,  
                    })
                }
            }
            
            
            res.send("Sabum Successfully created")
        }
        catch(err){
            res.status(500).send({
                message:
                    err.message || "some error occured"
            })
        }
    },

    SabumClassConnect: async (req, res, next) => {
        /* #swagger.description = "사범에 반정보를 추가합니다.<br />
        예시 값 : <br />
        [1,3,5]
        "
        */
        // #swagger.tags = ["사범"]
        // #swagger.summary = "사범 반 추가"

        sabum_id = req.params.sabum_id;
        dojang_id = req.params.dojang_id;
        const {class_arr} = req.body;
        
        try{
            arr_len = class_arr.length;
            for(i=0;i<arr_len;i++){
                if(!await models.Class.findOne({where:{
                    id:class_arr[i]}}
                    )){
                    return res.send("class_id not exist")
                }
                if(await models.InstructorClass.findOne({
                    where:
                    {
                        class:class_arr[i],sabum:sabum_id
                    },
                    attributes: ['createdAt']
                }
                    )){
                    return res.send("data exist")
                }
                console.log(class_arr[i],"###")
                await models.InstructorClass.create({class:class_arr[i],sabum:sabum_id})
                
            }
            const sabum_info = await models.Sabum.findAll({
                raw: true,
                where: {id: sabum_id},
                attributes: [
                    'id','photo_url','last_name','first_name','phone_number','level',
                    [sequelize.fn('date_format', sequelize.col('dob'), '%Y-%m-%d'), 'dob'],
                    [sequelize.fn('date_format', sequelize.col('dojang_reg_date'), '%Y-%m-%d'), 'dojang_reg_date'],
                    [sequelize.fn('date_format', sequelize.col('Sabum.createdAt'), '%Y-%m-%d'), 'createdAt'],
                    [sequelize.fn('date_format', sequelize.col('Sabum.updatedAt'), '%Y-%m-%d'), 'updatedAt'],
                ],
            })
            let query = `
                        SELECT C.id, C.title, C.kwanjang, C.dojang FROM Classes AS C
                        INNER JOIN InstructorClasses AS IC 
                        ON IC.class=C.id
                        WHERE IC.sabum=${sabum_id} 
                        ORDER BY C.id ASC
                        `
            const class_info = await sequelize.query(query, 
                {
                    type: Sequelize.QueryTypes.SELECT, 
                    raw: true   
                });
            sabum_info[0]["class_info"] = class_info
            return res.send(sabum_info)
        }
        catch(err){
            res.status(500).send({
                message:
                    err.message || "some error occured"
            })
        }
    },

    SabumRead: async (req, res, next) => {
        // #swagger.description = "사범을 조회합니다. id가 0이면 모두 검색, 0이 아닐 시 해당 id만 검색합니다."
        // #swagger.tags = ["사범"]
        // #swagger.summary = "사범 조회"
        /* #swagger.parameters['page'] = {
            in: "query",
            description: "페이지",
            type: "integer"
        }
        */
        sabum_id = req.params.sabum_id;
        dojang_id = req.params.dojang_id;
        let pageNum = req.query.page; // 요청 페이지 넘버
        let offset = 0;
        if(pageNum > 1){
            offset = 7 * (pageNum - 1);
        }
        
        if (sabum_id!=0) { // id 0이 아닐 때 하나 찾기
            try{
                let sabum_info = await models.Sabum.findOne({
                    where: {id:sabum_id},
                    attributes: ['id','photo_url','last_name','first_name','phone_number','level','dob','dojang_reg_date','user'],
                    raw: true
                })
                let account_info = await models.UserAccount.findOne({
                    where: {id: sabum_info.user},
                    attributes: ['username'],
                    raw: true
                })
                let incstuctorclass_info = await models.InstructorClass.findAll({
                    where: {sabum:sabum_id},
                    attributes: ['class'],
                    raw: true
                })

                class_arr = []
                for(let sabumclass of incstuctorclass_info){
                    let class_info = await models.Class.findOne({
                        where: {id: sabumclass.class},
                        attributes:['id','title']
                    })
                    class_arr.push(class_info)
                }
                sabum_info["UserAccount"] = account_info
                sabum_info["Classes_count"] = class_arr.length
                sabum_info["Classes"] = class_arr
                
                res.send(sabum_info);
            }
            catch(err){
                res.status(500).send({
                    message:
                        err.message || "some error occured"
                })
            }
        }
        else if(sabum_id == 0) { // id == 0 이면 모두 찾기
            try{
                let data = await models.Sabum.findAndCountAll({
                    raw: true,
                    include:
                    [
                        {
                            model: models.UserAccount,
                            attributes: {
                                include: [
                                    [sequelize.fn('date_format', sequelize.col('UserAccount.createdAt'), '%Y-%m-%d'), 'createdAt'],
                                    [sequelize.fn('date_format', sequelize.col('UserAccount.updatedAt'), '%Y-%m-%d'), 'updatedAt'],
                                ],
                            },
                        },
                        {
                            model: models.Dojang,
                            through: {
                                where: { dojang: dojang_id },
                            },
                            required: true,
                            attributes: {
                                include: [
                                    [sequelize.fn('date_format', sequelize.col('Sabum.createdAt'), '%Y-%m-%d'), 'createdAt'],
                                    [sequelize.fn('date_format', sequelize.col('Sabum.updatedAt'), '%Y-%m-%d'), 'updatedAt'],
                                ],
                            },
                        }
                    ],
                    attributes: {
                        include: [
                            [sequelize.fn('date_format', sequelize.col('dojang_reg_date'), '%Y-%m-%d'), 'dojang_reg_date'],
                            [sequelize.fn('date_format', sequelize.col('Sabum.createdAt'), '%Y-%m-%d'), 'createdAt'],
                            [sequelize.fn('date_format', sequelize.col('Sabum.updatedAt'), '%Y-%m-%d'), 'updatedAt'],
                        ],
                    },
                })
                data.rows.forEach(el=>el['Dojangs.SabumDojangs.createdAt'] = el['Dojangs.SabumDojangs.createdAt'].toISOString().split('T')[0])
                data.rows.forEach(el=>el['Dojangs.SabumDojangs.updatedAt'] = el['Dojangs.SabumDojangs.updatedAt'].toISOString().split('T')[0])
                res.send(data);
            }
            catch(err){
                res.status(500).send({
                    message:
                        err.message || "some error occured"
                })
            }
        }
    },

    SabumReadAll: async (req, res, next) => {
        // #swagger.description = "사범의 모든 정보를 조회합니다. "
        // #swagger.tags = ["사범"]
        // #swagger.summary = "사범 조회"
        /* #swagger.parameters['page'] = {
            in: "query",
            description: "페이지",
            type: "integer"
        }
        */
        try{
            const sabum_user_id = req.params.sabum_user_id;

            const sabum_info = await models.Sabum.findOne({
                where: {user: sabum_user_id},
                attributes: ['id'],
                raw:true
            })
            let sabum_id = sabum_info.id

            let pageNum = req.query.page; // 요청 페이지 넘버
            let offset = 0;
            
            if (pageNum > 1) {
                offset = 7 * (pageNum - 1);
            }
            
            if (sabum_id != 0){ // id 0이 아닐 때 하나 찾기
                let sabum_info = await models.Sabum.findOne({
                    where: {id: sabum_id},
                    raw:true
                })
                let sabum_career_info = await models.SabumCareer.findAll({
                    where: {sabum: sabum_id},
                    raw:true
                })
                let sabum_license_info = await models.SabumLicense.findAll({
                    where: {sabum: sabum_id},
                    raw:true
                })
                sabum_info['sabum_career_info'] = sabum_career_info
                sabum_info['sabum_license_info'] = sabum_license_info
                res.send(sabum_info)
            }
        }
        catch(err){
            res.status(500).send({
                message:
                    err.message || "some error occured"
            })
        }
    },

    SabumReadDetail: async (req, res, next) => {
        /* #swagger.description = "사범 상세정보를 조회합니다. 해당 id만 검색합니다.
        <br />
        ***MEANING*** <br /><br />
        admission_year : 입학연도, <br />
        admission_month : 입학월(date of birth) <br />
        graduated_year : 졸업연도 <br />
        graduated_month : 졸업월 <br />
        major : 전공 <br />
        grades : 학점 <br />
        career : 태권도경력 <br />
        driver_license : 운전면허증(1종/2종 등) <br />
        driver_license_obtaining_year : 운전면허증 취득연도 <br />
        driver_license_obtaining_month : 운전면허증 취득월 <br />
        transfer_status : 편입여부<boolean> <br />
        graduated_status : 졸업여부(재학, 휴학, 졸업 등) <br />
        level : 품/단 <br />
        tkd_level_number : 품/단 일련번호 <br />
        instructor_license_grade : 사범자격증 급수 <br />
        instructor_license_number : 사법자격증 일련번호 <br />
        life_sports_instructor_grade : 생활체육지도자 급수 <br />
        life_sports_instructor_number : 생활체육지도자 일련번호 <br />
        address_name : 주소 <br />
        address_detail : 상세주소 <br />
        region_1depth_name : 시도 단위 주소 <br />
        region_2depth_name : 구 단위 주소 <br />
        region_3depth_name : 동 단위 주소 <br />
        region_3depth_h_name : 행정동 명칭 주소 <br />
        "
        */
        // #swagger.tags = ["사범"]
        // #swagger.summary = "사범 상세 조회"
        /* #swagger.parameters['page'] = {
            in: "query",
            description: "페이지",
            type: "integer"
        }
        */
        sabum_id = req.params.sabum_id;
        dojang_id = req.params.dojang_id;
        let pageNum = req.query.page; // 요청 페이지 넘버
        let offset = 0;
        if(pageNum > 1){
            offset = 7 * (pageNum - 1);
        }
        try{
            if (!await models.Dojang.findOne({
                where : {id : dojang_id}
            })){return res.send("dojang_id not exist")}

            if (!await models.Sabum.findOne({
                where : {id : sabum_id}
            })){return res.send("sabum_id not exist")}

            if (!await models.SabumDojang.findOne({
                where : {sabum: sabum_id, dojang : dojang_id}
            })){return res.send("sabum dojang are not associated")}

            const Sabum_data = await models.Sabum.findOne({
                raw: true,
                where: {id:sabum_id},
                attributes: {exclude: ['createdAt','updatedAt']}
            })
            const sabum_career = await models.SabumCareer.findAll({
                raw: true,
                where: {sabum:sabum_id}
            })
            const sabum_license = await models.SabumLicense.findAll({
                raw: true,
                where: {sabum:sabum_id}
            })
            console.log(sabum_career,"@!#@!@%@!%@@")
            Sabum_data.Sabum_career=sabum_career
            Sabum_data.sabum_license=sabum_license
            res.send(Sabum_data);
        }
        catch(err){
            res.status(500).send({
                message:
                    err.message || "some error occured"
            })
        }
    },

    SabumDojangDisconnect: async (req, res, next) => {
        /* #swagger.description = "사범을 퇴소 처리합니다"
        */
        // #swagger.tags = ["사범"]
        // #swagger.summary = "사범 퇴소"
        try{
            const sabum_id = req.params.sabum_id;
            const dojang_id = req.params.dojang_id;
            console.log(sabum_id,"sabum_id")
            console.log(dojang_id,"dojang_id")
            const today = new Date()
            const auth_id = req.id
            const auth_role = req.role
            //도장의 관장인지 체크
            if(auth_role == 'KWANJANG'){
                let kwanjang_info = await models.KwanjangInfo.findOne({
                    where: {user:auth_id},
                    attributes: ['id'],
                    raw:true
                })
                let kwanjangdojang_info = await models.KwanjangDojang.findOne({
                    where: {dojang: dojang_id, kwanjang: kwanjang_info.id},
                    raw:true
                })
                if(!kwanjangdojang_info){
                    return res.send("you are not authorized kwanjang")
                }
            }
            //사범 본인인지 체크
            else if(auth_role == 'SABUM'){
                let sabum_info = await models.Sabum.findOne({
                    where: {id:sabum_id},
                    attributes: ['user'],
                    raw:true
                })
                if(sabum_info.user != auth_id){
                    return res.send("you are not authorized sabum")
                }
            }
            
            let sabum_info = await models.Sabum.findOne({
                where: {id: sabum_id},
                attributes: ['user','last_name','first_name','level'],
                raw:true
            })
            let dojang_info = await models.Dojang.findOne({
                where: {id: dojang_id},
                attributes:['name'],
                raw:true
            })
            let sabumdojang_info = await models.SabumDojang.findOne({
                where: {dojang: dojang_id, sabum: sabum_id},
                attributes: ['createdAt'],
                raw:true
            })

            await models.Sabum_log.create({
                sabum_user_id: sabum_info.user, last_name:sabum_info.last_name,
                first_name:sabum_info.first_name, dojang: dojang_id,
                dojang_start_date: sabumdojang_info.createdAt,
                dojang_end_date: today, dojang_name: dojang_info.name,
                level: sabum_info.level
            })

            await models.SabumDojang.destroy(
                {
                    where: { dojang: dojang_id, sabum: sabum_id}
                },
                res.send("Sabum successfully deleted")
            )   
            let class_info = await models.Class.findAll({
                where: {dojang: dojang_id},
                attributes:['id'],
                raw:true
            })
            for(let class_one of class_info){
                await models.InstructorClass.destroy(
                    {
                        where: { sabum: sabum_id, class: class_one.id }
                    },
                )   
            }
        }
        catch(err){
            res.status(500).send({
                message:
                    err.message || "some error occured"
            })
        }
    },

    SabumReadByClass: async (req, res, next) => {
        /* #swagger.description = "도장, 반 별로 사범을 조회. <br />
        사범의 정확한 count수는 sabum_count입니다 <br />
        null 입력시 미배정, 0 입력시 모두 조회"
        */
        // #swagger.tags = ["사범"]
        // #swagger.summary = "도장, 반 별 사범 조회"
        class_id = req.params.class_id;
        dojang_id = req.params.dojang_id;
        try{
            let resultArr = []
            
            if(class_id == "null"){
                let class_arr = []
                console.log("datas")
                ///도장에 속한 모든 사범 ID 추출
                let datas = await models.Sabum.findAll({
                    include: {
                        model: models.Dojang,
                        through: {
                            where: {dojang:dojang_id},
                            attributes:[]
                        },
                        required: true,
                        attributes:[]
                    },
                    attributes:['id'],
                    raw:true
                })
                ///사부 반 테이블에서 사범 ID를 돌며 해당하지 않는경우 추출
                for (let data of datas){
                    const result = await models.InstructorClass.findOne({
                        where: {sabum : data.id}
                    })
                    
                    if(!result){
                        let instructorclass_info = await models.InstructorClass.findAll({
                            where: {sabum : data.id},
                            attributes: ['class'],
                            raw: true
                        })
                        
                        for(let instructorclass of instructorclass_info){
                            class_info = await models.Class.findOne({
                                where: {id: instructorclass.class},
                                attributes: ['id','title'],
                                raw: true
                            })
                            if(data.id == class_info.id )
                            {
                                class_arr.push(class_info)
                            }
                        }
                        
                        let sabum_info = await models.Sabum.findOne({
                            where : {id:data.id},
                            raw: true,
                            attributes: ['id','photo_url','last_name','first_name','phone_number','dojang_reg_date']
                        })
                        sabum_info["Classes"] = class_arr
                        resultArr.push(sabum_info)
                    }
                }
                result_Obj = new Object
                result_Obj["count"] = resultArr.length
                result_Obj["rows"] = resultArr
                res.send(result_Obj)
            }
            else if(class_id == 0){
                
                console.log("datas")
                ///도장에 속한 모든 사범 ID 추출
                let datas = await models.Sabum.findAll({
                    include: {
                        model: models.Dojang,
                        through: {
                            where: {dojang:dojang_id},
                            attributes:[]
                        },
                        required: true,
                        attributes:[]
                    },
                    attributes:['id'],
                    raw:true
                })
                ///사부 반 테이블에서 사범 ID를 돌며 해당하지 않는경우 추출
                for (let data of datas){
                    let instructorclass_info = await models.InstructorClass.findAll({
                        where: {sabum : data.id},
                        attributes: ['class'],
                        raw: true
                    })
                    console.log(instructorclass_info,"instructorclass_info")

                    let class_arr = []
                    for(let instructorclass of instructorclass_info){
                        let class_info = await models.Class.findOne({
                            where: {id: instructorclass.class},
                            attributes: ['id','title'],
                            raw:true
                        })
                        console.log(class_info,"class_info")
                        class_arr.push(class_info)
                    }
                    
                    let sabum_info = await models.Sabum.findOne({
                        where : {id:data.id},
                        raw: true,
                        attributes: ['id','photo_url','last_name','first_name','phone_number','dojang_reg_date']
                    })
                    sabum_info["Classes"] = class_arr
                    resultArr.push(sabum_info)
                }
                result_Obj = new Object
                result_Obj["count"] = resultArr.length
                result_Obj["rows"] = resultArr
                res.send(result_Obj)
            }
            else if(class_id!=0){
                ///해당 반에 속한 모든 사범 ID 추출
                let datas = await models.Sabum.findAll({
                    include: {
                        model: models.Dojang,
                        through: {
                            where: {dojang:dojang_id},
                            attributes:[]
                        },
                        required: true,
                        attributes:[]
                    },
                    attributes:['id'],
                    raw:true
                })
                ///사부 반 테이블에서 사범 ID를 해당 반에 속한 경우 추출
                for (let data of datas){
                    const result = await models.InstructorClass.findOne({
                        where: {sabum : data.id, class: class_id}
                    })
                    
                    if(result){
                        let instructorclass_info = await models.InstructorClass.findAll({
                            where: {sabum : data.id},
                            attributes: ['class'],
                            raw: true
                        })
                        console.log(instructorclass_info,"instructorclass_info")

                        let class_arr = []
                        for(let instructorclass of instructorclass_info){
                            let class_info = await models.Class.findOne({
                                where: {id: instructorclass.class},
                                attributes: ['id','title'],
                                raw:true
                            })
                            console.log(class_info,"class_info")
                            class_arr.push(class_info)
                        }
                        
                        let sabum_info = await models.Sabum.findOne({
                            where : {id:data.id},
                            raw: true,
                            attributes: ['id','photo_url','last_name','first_name','phone_number','dojang_reg_date']
                        })
                        sabum_info["Classes"] = class_arr
                        resultArr.push(sabum_info)
                    }
                }
                result_Obj = new Object
                result_Obj["count"] = resultArr.length
                result_Obj["rows"] = resultArr
                res.send(result_Obj)
            }
        }
        
        catch(err){
            res.status(500).send({
                message:
                    err.message || "some error occured"
            })
        }
    },

    SabumUpdate: async (req,res) => {
        /* #swagger.description = "사범을 수정합니다. user column INTEGER necessary <br />
        <br />
        user 는 수정이 없다면 안보내시면 되고 존재하는 ID로 입력하면 수정되며, null로 변경을 하시려면 -1을 입력 하면 됩니다
        <br />
        ***MEANING*** <br /><br />
        admission_year : 입학연도, <br />
        admission_month : 입학월(date of birth) <br />
        graduated_year : 졸업연도 <br />
        graduated_month : 졸업월 <br />
        major : 전공 <br />
        grades : 학점 <br />
        career : 태권도경력 <br />
        driver_license : 운전면허증(1종/2종 등) <br />
        driver_license_obtaining_year : 운전면허증 취득연도 <br />
        driver_license_obtaining_month : 운전면허증 취득월 <br />
        transfer_status : 편입여부<boolean> <br />
        graduated_status : 졸업여부(재학, 휴학, 졸업 등) <br />
        level : 품/단 <br />
        tkd_level_number : 품/단 일련번호 <br />
        instructor_license_grade : 사범자격증 급수 <br />
        instructor_license_number : 사법자격증 일련번호 <br />
        life_sports_instructor_grade : 생활체육지도자 급수 <br />
        life_sports_instructor_number : 생활체육지도자 일련번호 <br />
        address_name : 주소 <br />
        address_detail : 상세주소 <br />
        region_1depth_name : 시도 단위 주소 <br />
        region_2depth_name : 구 단위 주소 <br />
        region_3depth_name : 동 단위 주소 <br />
        region_3depth_h_name : 행정동 명칭 주소 <br />
        "
        */
        // #swagger.tags = ["사범"]
        // #swagger.summary = "사범 수정"
        
        try{
            let { first_name, last_name, phone_number, sex, address_name, road_address,
                region_1depth_name, region_2depth_name, region_3depth_name,
                region_3depth_h_name, address_detail, country, dob, ssn, email, 
                language, dojang_reg_date, is_approved, admission_year, 
                admission_month, graduated_year, graduated_month, school_name, 
                major, grades, career, sabumcareer, sabumlicense, 
                driver_license, driver_license_obtaining_year, total_grades,
                driver_license_obtaining_month, transfer_status, graduated_status,
                level, tkd_level_number, instructor_license_grade, 
                instructor_license_number, life_sports_instructor_grade, 
                life_sports_instructor_number, sabum_career_info, sabum_license_info, 
                sabum_award_info, delImgname} = req.body;
            const sabum_id = req.params.sabum_id;
            if (!await models.Sabum.findOne({
                where : {id : sabum_id}
            })){return res.send("sabum not exist")}
            let FILE = req.file;
            let photo_url = []
            //기존 파일들 뽑아냄
            defaultPhoto = await models.Sabum.findOne({
                where: {id:sabum_id},
                attributes: ['photo_url'],
                raw: true
            })
            //string 형태를 json형태로 변환하는 역할
            defaultPhoto = defaultPhoto.photo_url.split(',')
            //img
            //해당 키의 파일이 있을때만 실행
            if(FILE){
                //원래 파일이 있으면 지우고 원래 파일 가공
                if(defaultPhoto){
                    default_img = defaultPhoto[0]
                    console.log(default_img,"default_img")
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
                    where: {urls:"sabum/img/"+imageName}
                })){imageName = generateFileName();}
                imageName = "sabum/img/"+imageName
                await models.UrlGroup.create({urls:imageName}) //url group에 늘리기
                await uploadFile(FILE.buffer, imageName, FILE.mimetype)
                photo_url.push(imageName)
                //저장을 위한 문자화
                photo_url = JSON.stringify(photo_url)
                //파일 하나인 경우 저장 시 key값만 저장하도록 가공
                photo_url = photo_url.slice(2,-2)
                //따로 따로 업데이트
                await models.Sabum.update(
                    {
                        photo_url
                    },
                    {
                        where: { id: sabum_id }
                    }
                )
            }
            else if(delImgname){
                console.log(delImgname,"delImgname")
                default_img = defaultPhoto
                if(delImgname == default_img){
                    await deleteFile(default_img),
                    await models.UrlGroup.destroy({ //url group에서 삭제하기
                        where: {urls: default_img}
                    })
                }
                await models.Sabum.update(
                    {photo_url : null},
                    {where: {id : sabum_id}}
                )
            }
            
            if(grades>total_grades || grades < 0){
                return res.send("grades wrong number")
            }
            await models.Sabum.update(
            { 
                first_name, last_name, phone_number, sex, address_name, road_address,
                region_1depth_name, region_2depth_name, region_3depth_name,
                region_3depth_h_name, address_detail, country, dob, ssn, email, 
                language, dojang_reg_date, is_approved, admission_year, 
                admission_month, graduated_year, graduated_month, school_name, 
                major, grades, career, sabumcareer, sabumlicense, 
                driver_license, driver_license_obtaining_year, total_grades,
                driver_license_obtaining_month, transfer_status, graduated_status,
                level, tkd_level_number, instructor_license_grade, 
                instructor_license_number, life_sports_instructor_grade, 
                life_sports_instructor_number
            },
            {
                where : { id: sabum_id }
            }
            )
            let sabum_info = await models.Sabum.findOne({
                where: {id: sabum_id},
                attributes: ['user'],
                raw:true
            })
            if(sabum_info.user){
                await models.UserAccount.update(
                    {
                        email, phone_number, first_name, last_name
                    },
                    {
                        where: {id : sabum_info.user}
                    } 
                ) 
            }

            //생성
            if(sabum_career_info){
                sabum_career_info = JSON.parse(sabum_career_info)
                await models.SabumCareer.destroy(
                    {
                        where: {sabum: sabum_id},
                    },
                )
                for(let sabum_career_one of sabum_career_info){
                    await models.SabumCareer.create({
                        sabum: sabum_id,
                        dojang_name: sabum_career_one.dojang_name,
                        employment_start_year: sabum_career_one.employment_start_year,
                        employment_start_month: sabum_career_one.employment_start_month,
                        employment_end_year: sabum_career_one.employment_end_year,
                        employment_end_month: sabum_career_one.employment_end_month,
                    }
                    )
                }
            }
            if(sabum_license_info){
                sabum_license_info = JSON.parse(sabum_license_info)
                await models.SabumLicense.destroy({
                    where: {sabum: sabum_id},
                })
                for(let sabum_license_one of sabum_license_info){
                    await models.SabumLicense.create({
                        sabum: sabum_id,
                        license_grade: sabum_license_one.license_grade, 
                        license_name: sabum_license_one.license_name,  
                        license_number: sabum_license_one.license_number
                    })
                }
            }

            if(sabum_award_info){
                sabum_award_info = JSON.parse(sabum_award_info)
                await models.SabumAward.destroy({
                    where: {sabum: sabum_id},
                })
                for(let sabum_award_one of sabum_award_info){
                    await models.SabumAward.create({
                        sabum :sabum_id,
                        award_contents: sabum_award_one.award_contents, 
                        award_date: sabum_award_one.award_date, 
                    })
                }
            }

            res.send("Sabum successfully updated")
        }
        catch(err){
            res.status(500).send({
                message:
                    err.message || "some error occured"
            })
        }
    },

    SabumDelete: async (req,res) => {
        // #swagger.description = "사범을 지웁니다."
        // #swagger.tags = ["사범"]
        // #swagger.summary = "사범 삭제"
        const sabum_id = req.params.sabum_id;
        await models.Sabum.destroy(
        {
            where : { id: sabum_id }
        } 
        ).then(() =>{
            res.send("SabumInfo successfully deleted")
        }).catch(err => {
            console.error(err);
        })
    },

}
