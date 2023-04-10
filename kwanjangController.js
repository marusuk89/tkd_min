const models = require("../models");
const bcrypt = require("bcrypt");
const Sequelize = require('sequelize');
const { sequelize } = require('../models');

const crypto = require("crypto");
const generateFileName = (bytes = 8) =>
    crypto.randomBytes(bytes).toString("hex");
const { uploadFile, getObjectSignedUrl, deleteFile } = require("../util/s3.js");

const { database } = require("firebase-admin");
const { RDS } = require("aws-sdk");
const sabumlicense = require("../models/sabumlicense");
const { ObjectAlreadyInActiveTierError } = require("@aws-sdk/client-s3");
const Op = Sequelize.Op;

const DEFAULT_PROFILE_URL = "student/default_profile.jpg"

module.exports = {
    registerKwanJang: async (req, res) => {
        // #swagger.description = "관장을 등록합니다."
        // #swagger.tags = ["관장"]
        // #swagger.summary = "관장 등록"
        
        /* #swagger.parameters['obj'] = { 
            in: 'body',
            description: 'qwe',
            schema: { $ref: "#/definitions/upload" }
        } */
        const { username, password, first_name, last_name, phone_number, sex, country, dob, level, ssn, language } = req.body;
        const user = await models.UserAccount.findOne({ raw: true, where: { username: username } })
        if (user) {
            return res.send("Someone else is using this username. Try other username");
        }
        else {
            const password2 = await bcrypt.hash(password, 10);
            let user_id = await models.UserAccount.create({ username, password: password2 });
            const kwanjang = await models.KwanjangInfo.findOne({ where: { phone_number } })
            if (kwanjang) {
                return res.send("Given infos are already used.")
            }
            await models.KwanjangInfo.create({ first_name, last_name, phone_number, sex, country, dob, level, ssn, language, user: user_id.id })

            return res.send(user_id);
        }
    },

    //Kwanjang
    KwanjangCreate: async (req, res, next) => {
        /* #swagger.description = "관장을 생성합니다. user는 유저 ID"
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
        // #swagger.tags = ["관장"]
        // #swagger.summary = "관장 생성"
        try{
            let FILE = req.file;
            let photo_url = []
            const auth_id = req.id
            const auth_role = req.role
            if(auth_role != 'KWANJANG'){
                return res.send("you are not kwanjang")
            }
            if(FILE){
                if(FILE.mimetype.split('/')[0]=="image"){
                    let imageName = generateFileName();
                    if(await models.UrlGroup.findOne({
                        where: {urls:"kwanjang/img/"+imageName}
                    })){imageName = generateFileName();}
                    imageName = "kwanjang/img/"+imageName
                    await models.UrlGroup.create({urls:imageName}) //url group에 늘리기
                    await uploadFile(FILE.buffer, imageName, FILE.mimetype)
                    photo_url.push(imageName)
                }
            }
            else{
                photo_url.push(DEFAULT_PROFILE_URL)
            }
            photo_url = JSON.stringify(photo_url).slice(2,-2)

            let { sex, address_name, road_address, 
                region_1depth_name, region_2depth_name, region_3depth_name, 
                region_3depth_h_name, address_detail, country, dob, ssn, 
                language, dojang_reg_date, is_approved, admission_year, admission_month
                , graduated_year, graduated_month, school_name, major
                , grades, total_grades, career, driver_license, driver_license_obtaining_year
                , driver_license_obtaining_month, transfer_status, graduated_status
                , level, tkd_level_number, instructor_license_grade
                , instructor_license_number, life_sports_instructor_grade
                , life_sports_instructor_number, kwanjang_career_info, kwanjang_license_info,
                kwanjang_award_info } = req.body;
            if(grades>total_grades || grades < 0){
                res.send("grades wrong number")
            }
            let useraccount_info = await models.UserAccount.findOne({
                where: {id: auth_id},
                attributes: ['last_name','first_name','email','phone_number'],
                raw:true
            })
            console.log(kwanjang_career_info,"kwanjang_career_info")
            console.log(kwanjang_license_info,"kwanjang_license_info")
            console.log(req.body,"req.body")
            const kwanjang_temp = await models.KwanjangInfo.create({ first_name: useraccount_info.first_name,
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
            
            if(kwanjang_career_info){
                kwanjang_career_info = JSON.parse(kwanjang_career_info)
                console.log(kwanjang_career_info,"career")
                for(let kwanjang_career_one of kwanjang_career_info){
                    await models.KwanjangCareer.create({
                        kwanjang :kwanjang_temp.id,
                        dojang_name: kwanjang_career_one.dojang_name,
                        employment_start_year: kwanjang_career_one.employment_start_year,
                        employment_start_month: kwanjang_career_one.employment_start_month,
                        employment_end_year: kwanjang_career_one.employment_end_year,
                        employment_end_month: kwanjang_career_one.employment_end_month,
                    })
                }
            }
            if(kwanjang_license_info){
                console.log(kwanjang_license_info,"license")
                kwanjang_license_info = JSON.parse(kwanjang_license_info)
                for(let kwanjang_license_one of kwanjang_license_info){
                    console.log(kwanjang_license_one,"kwanjang_license_one")
                    await models.KwanjangLicense.create({
                        kwanjang :kwanjang_temp.id,
                        license_grade: kwanjang_license_one.license_grade, 
                        license_name: kwanjang_license_one.license_name,  
                        license_number: kwanjang_license_one.license_number
                    })
                }
            }
            if(kwanjang_award_info){
                kwanjang_award_info = JSON.parse(kwanjang_award_info)
                for(let kwanjang_award_one of kwanjang_award_info){
                    await models.KwanjangAward.create({
                        kwanjang :kwanjang_temp.id,
                        award_contents: kwanjang_award_one.award_contents,  
                        award_date: kwanjang_award_one.award_date
                    })
                }
            }
            
            res.send("KwanjangInfo Successfully created")
        }
        catch(err){
            res.status(500).send({
                message:
                    err.message || "some error occured"
            })
        }
    }, 

    // 관장이 신규로 가입시 저장된 도장 정보를 불러와 신규 정보 등록
    KwanjangSign: async (req, res) => {
        // #swagger.description = "도장정보를 불러온 경우 실행 됨. 하나의 연결된 계정, 관장, 도장 정보를 생성합니다."
        // #swagger.tags = ["관장"]
        // #swagger.summary = "관장 "
        try{
            const { username, password, first_name, last_name, phone_number, email, dojang_name, dojang_number, dojang_address, dojang_address_detail, BR_number, BR } = req.body;
            const password2 = await bcrypt.hash(password, 10);
            await models.KwanjangInfo.create({ first_name, last_name, phone_number, email})
            await models.UserAccount.create({username, password: password2})
            await models.Dojang.create({ BR, BR_number, name: dojang_name, phone_number: dojang_number, address_name: dojang_address, address_detail: dojang_address_detail})
            res.send("Kwanjang Successfully created")
        }
        catch(err) {
            res.status(500).send({
                message:
                    err.message || "some error occured"
            })
        }
    },

    KwanjangRead: async (req, res, next) => {
        // #swagger.description = "관장을 조회합니다. id가 0이면 모두 검색, 0이 아닐 시 해당 id만 검색합니다."
        // #swagger.tags = ["관장"]
        // #swagger.summary = "관장 조회"
        /* #swagger.parameters['page'] = {
            in: "query",
            description: "페이지",
            type: "integer"
        }
        */
        kwanjang_id = req.params.kwanjang_id;

        let pageNum = req.query.page; // 요청 페이지 넘버
        let offset = 0;
        
        if (pageNum > 1) {
            offset = 7 * (pageNum - 1);
        }
        if (kwanjang_id != 0) { // id 0이 아닐 때 하나 찾기
            models.KwanjangInfo.findAll({
                where: {
                    id: kwanjang_id
                },
                include: [
                    {
                        model: models.UserAccount,
                        required: true,
                        attributes: [
                            'username', 'id',
                            [sequelize.fn('date_format', sequelize.col('KwanjangInfo.createdAt'), '%Y-%m-%d'), 'createdAt'],
                            [sequelize.fn('date_format', sequelize.col('KwanjangInfo.updatedAt'), '%Y-%m-%d'), 'updatedAt'],
                        ]
                    }
                ],
                attributes: {
                    include: [
                        [sequelize.fn('date_format', sequelize.col('KwanjangInfo.createdAt'), '%Y-%m-%d'), 'createdAt'],
                        [sequelize.fn('date_format', sequelize.col('KwanjangInfo.updatedAt'), '%Y-%m-%d'), 'updatedAt'],
                    ],
                },
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
        }
        else { // id == 0 이면 모두 찾기
            try{
                const data = await models.KwanjangInfo.findAll({
                offset: offset,
                limit: 7,
                })
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

    KwanjangReadAll: async (req, res, next) => {
        // #swagger.description = "관장의 모든 정보를 조회합니다."
        // #swagger.tags = ["관장"]
        // #swagger.summary = "관장 조회"
        /* #swagger.parameters['page'] = {
            in: "query",
            description: "페이지",
            type: "integer"
        }
        */
        try{
            const kwanjang_user_id = req.params.kwanjang_user_id;

            const kwanjang_info = await models.KwanjangInfo.findOne({
                where: {user: kwanjang_user_id},
                attributes: ['id'],
                raw:true
            })
            let kwanjang_id = kwanjang_info.id
            
            let pageNum = req.query.page; // 요청 페이지 넘버
            let offset = 0;
            
            if (pageNum > 1) {
                offset = 7 * (pageNum - 1);
            }
            
            if (kwanjang_id != 0){ // id 0이 아닐 때 하나 찾기
                let kwanjang_info = await models.KwanjangInfo.findOne({
                    where: {id: kwanjang_id},
                    raw:true
                })
                let kwanjang_career_info = await models.KwanjangCareer.findAll({
                    where: {kwanjang: kwanjang_id},
                    raw:true
                })
                let kwanjang_license_info = await models.KwanjangLicense.findAll({
                    where: {kwanjang: kwanjang_id},
                    raw:true
                })
                if(kwanjang_career_info.length > 0){
                    kwanjang_info['kwanjang_career_info'] = kwanjang_career_info
                }
                if(kwanjang_license_info.length > 0){
                    kwanjang_info['kwanjang_license_info'] = kwanjang_license_info
                }
                res.send(kwanjang_info)
            }
        }
        catch(err){
            res.status(500).send({
                message:
                    err.message || "some error occured"
            })
        }
    },

    KwanjangUpdate: async (req, res) => {
        /* #swagger.description = "관장을 수정합니다.<br />
        user 는 수정이 없다면 안보내시면 되고 존재하는 ID로 입력하면 수정되며, null로 변경을 하시려면 -1을 입력 하면 됩니다"
        */
        // #swagger.tags = ["관장"]
        // #swagger.summary = "관장 수정"

        try{
            let { first_name, last_name, phone_number,sex, address_name, road_address, 
                region_1depth_name, region_2depth_name, region_3depth_name, 
                region_3depth_h_name, address_detail, country, dob, ssn, email,
                language, dojang_reg_date, is_approved, admission_year, admission_month
                , graduated_year, graduated_month, school_name, major
                , grades, total_grades, career, driver_license, driver_license_obtaining_year
                , driver_license_obtaining_month, transfer_status, graduated_status
                , level, tkd_level_number, instructor_license_grade
                , instructor_license_number, life_sports_instructor_grade
                , life_sports_instructor_number, kwanjang_career_info, kwanjang_license_info,
                kwanjang_award_info, delImgname} = req.body;
            const kwanjang_id = req.params.kwanjang_id;
            if (!await models.KwanjangInfo.findOne({
                where : {id : kwanjang_id}
            })){return res.send("kwanjang not exist")}

            if(grades>total_grades || grades < 0){
                return res.send("grades wrong number")
            }

            let FILE = req.file;
            let photo_url = []
            //기존 파일들 뽑아냄
            defaultPhoto = await models.KwanjangInfo.findOne({
                where: {id:kwanjang_id},
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
                    where: {urls:"kwanjang/img/"+imageName}
                })){imageName = generateFileName();}
                imageName = "kwanjang/img/"+imageName
                await models.UrlGroup.create({urls:imageName}) //url group에 늘리기
                await uploadFile(FILE.buffer, imageName, FILE.mimetype)
                photo_url.push(imageName)
                //저장을 위한 문자화
                photo_url = JSON.stringify(photo_url)
                //파일 하나인 경우 저장 시 key값만 저장하도록 가공
                photo_url = photo_url.slice(2,-2)
                //따로 따로 업데이트
                await models.KwanjangInfo.update(
                    {
                        photo_url
                    },
                    {
                        where: { id: kwanjang_id }
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
                await models.KwanjangInfo.update(
                    {photo_url : null},
                    {where: {id : kwanjang_id}}
                )
            }

            
            await models.KwanjangInfo.update(
                {
                    first_name, last_name, phone_number, 
                sex, address_name, road_address, region_1depth_name, region_2depth_name,
                region_3depth_name, region_3depth_h_name, address_detail,
                country, dob, ssn, email, language, dojang_reg_date, is_approved,
                admission_year, admission_month, graduated_year, graduated_month, school_name
                , major, grades, total_grades, career, driver_license, driver_license_obtaining_year
                , driver_license_obtaining_month, transfer_status, graduated_status
                , level, tkd_level_number, instructor_license_grade
                , instructor_license_number, life_sports_instructor_grade
                , life_sports_instructor_number
                },
                {
                    where: { id: kwanjang_id }
                }
            )
            let kwanjang_info = await models.KwanjangInfo.findOne({
                where: {id: kwanjang_id},
                attributes: ['user'],
                raw:true
            })
            if(kwanjang_info.user){
                await models.UserAccount.update(
                    {
                        email, phone_number, first_name, last_name
                    },
                    {
                        where: {id : kwanjang_info.user}
                    } 
                )
            }
            
            //생성
            if(kwanjang_career_info){
                await models.KwanjangCareer.destroy({
                    kwanjang: kwanjang_id,
                })
                kwanjang_career_info = JSON.parse(kwanjang_career_info)
                for(let kwanjang_career_one of kwanjang_career_info){
                    await models.KwanjangCareer.create({
                        kwanjang: kwanjang_id,
                        dojang_name: kwanjang_career_one.dojang_name,
                        employment_start_year: kwanjang_career_one.employment_start_year,
                        employment_start_month: kwanjang_career_one.employment_start_month,
                        employment_end_year: kwanjang_career_one.employment_end_year,
                        employment_end_month: kwanjang_career_one.employment_end_month,
                    }
                    )
                }
            }
            if(kwanjang_license_info){
                await models.KwanjangLicense.destroy({
                    kwanjang: kwanjang_id,
                })
                kwanjang_license_info = JSON.parse(kwanjang_license_info)
                for(let kwanjang_license_one of kwanjang_license_info){
                    console.log(kwanjang_license_one,"kwanjang_license_one")
                    await models.KwanjangLicense.create({
                        kwanjang: kwanjang_id,
                        license_grade: kwanjang_license_one.license_grade, 
                        license_name: kwanjang_license_one.license_name,  
                        license_number: kwanjang_license_one.license_number
                    })
                }
            }
            if(kwanjang_award_info){
                await models.KwanjangAward.destroy({
                    kwanjang: kwanjang_id,
                })
                kwanjang_award_info = JSON.parse(kwanjang_award_info)
                for(let kwanjang_award_one of kwanjang_award_info){
                    await models.KwanjangAward.create({
                        kwanjang :kwanjang_id,
                        award_contents: kwanjang_award_one.award_contents,  
                        award_date: kwanjang_award_one.award_date 
                    })
                }
            }

            // //수정
            // if(update_career_info){
            //     update_career_info = JSON.parse(update_career_info)
            //     for(let update_career_one of update_career_info){
            //         await models.KwanjangCareer.update({
            //             dojang_name: update_career_one.dojang_name,
            //             employment_start_year: update_career_one.employment_start_year,
            //             employment_start_month: update_career_one.employment_start_month,
            //             employment_end_year: update_career_one.employment_end_year,
            //             employment_end_month: update_career_one.employment_end_month,
            //         },
            //         {
            //             where: {kwanjang: kwanjang_id, id:update_career_one.id}
            //         }
            //         )
            //     }
            // }
            // if(update_license_info){
            //     update_license_info = JSON.parse(update_license_info)
            //     for(let update_license_one of update_license_info){
            //         await models.KwanjangCareer.update({
            //             dojang_name: update_license_one.dojang_name,
            //             employment_start_year: update_license_one.employment_start_year,
            //             employment_start_month: update_license_one.employment_start_month,
            //             employment_end_year: update_license_one.employment_end_year,
            //             employment_end_month: update_license_one.employment_end_month,
            //         },
            //         {
            //             where: {kwanjang: kwanjang_id, id:update_license_one.id}
            //         }
            //         )
            //     }
            // }
            // // 삭제
            // if(del_career_info){
            //     del_career_info = JSON.parse(del_career_info)
            //     for(let del_career_one of del_career_info){
            //         await models.KwanjangCareer.destroy({
            //             where: {id: del_career_one}
            //         }
            //         )
            //     }
            // }
            // if(del_license_info){
            //     del_license_info = JSON.parse(del_license_info)
            //     for(let del_license_one of del_license_info){
            //         await models.KwanjangCareer.destroy({
            //             where: {id: del_license_one}
            //         }
            //         )
            //     }
            // }

            res.send("success")
        }
        catch(err){
            res.status(500).send({
                message:
                    err.message || "some error occured"
            })
        }
    },

    KwanjangDelete: async (req, res) => {
        // #swagger.description = "관장을 지웁니다."
        // #swagger.tags = ["관장"]
        // #swagger.summary = "관장 삭제"
        try{
            const kwanjang_id = req.params.kwanjang_id;
            
            await models.KwanjangInfo.destroy(
                {
                    where: { id: kwanjang_id }
                },
                res.send("Kwanjang successfully deleted")
            )   
        }
        catch(err){
            res.status(500).send({
                message:
                    err.message || "some error occured"
            })
        }
    },

    KwanjangDischarge: async (req, res) => {
        // #swagger.description = "도장에서 관장을 지웁니다."
        // #swagger.tags = ["관장"]
        // #swagger.summary = "관장 퇴소"
        try{
            const kwanjang_id = req.params.kwanjang_id;
            const dojang_id = req.params.dojang_id;
            const today = new Date()
            
            let kwanjang_info = await models.KwanjangInfo.findOne({
                where: {id: kwanjang_id},
                attributes: ['user','last_name','first_name','level'],
                raw:true
            })
            let dojang_info = await models.Dojang.findOne({
                where: {id: dojang_id},
                attributes:['name'],
                raw:true
            })
            let kwanjangdojang_info = await models.KwanjangDojang.findOne({
                where: {dojang: dojang_id, kwanjang: kwanjang_id},
                attributes: ['createdAt'],
                raw:true
            })

            await models.Kwanjang_log.create({
                kwanjang_user_id: kwanjang_info.user, last_name:kwanjang_info.last_name,
                first_name:kwanjang_info.first_name, dojang: dojang_id,
                dojang_start_date: kwanjangdojang_info.createdAt,
                dojang_end_date: today, dojang_name: dojang_info.name,
                level: kwanjang_info.level
            })

            await models.KwanjangDojang.destroy(
                {
                    where: { Dojang: dojang_id, kwanjang: kwanjang_id}
                },
            )   
            
            let class_info = await models.Class.findAll({
                where: {dojang: dojang_id},
                attributes:['id'],
                raw:true
            })
            for(let class_one of class_info){
                await models.InstructorClass.destroy(
                    {
                        where: { kwanjang: kwanjang_id, class: class_one.id }
                    },
                )
            }
            res.send("Kwanjang successfully deleted")
        }
        catch(err){
            res.status(500).send({
                message:
                    err.message || "some error occured"
            })
        }
    },

    //반정보를 통해 InstructorClass 추가 | 삭제
    InstructorCreateByTitle: async (req, res, next) => {
        // #swagger.description = "반 이름, 사부 종류(kwanjang / sabum), 사부 ID를 받아 해당 반의 사부를 생성합니다. response는 해당 반의 해당 사부 정보가 반환됩니다"
        // #swagger.tags = ["관장"]
        // #swagger.summary = "사부 생성"
        const class_id = req.params.class_id;
        const dojang_id = req.params.dojang_id;
        const instructor_type = req.params.instructor_type;
        const instructor_id = req.params.instructor_id;
        try{
            
            if (!await models.Class.findOne({
                where : {id : class_id}
            })){return res.send("class_id not exist")}

            if (!await models.Dojang.findOne({
                where : {id : dojang_id}
            })) {return res.send("dojang_id not exist")}

            if (!await models.Class.findOne({
                where : {dojang: dojang_id, id: class_id}
            })){return res.send("Class Dojang are not associated")}

            if(instructor_type == "kwanjang"){
                if (!await models.KwanjangInfo.findOne({
                    where : {id : instructor_id}
                })){return res.send("kwanjang_id not exist")}

                if(await models.InstructorClass.findOne({
                    where : {kwanjang: instructor_id, class: class_id}}))
                    {return res.send("kwanjang class already exist")}

                if(!await models.KwanjangInfo.findOne({
                    include : [
                        {
                            model: models.Dojang,
                            through: {
                                where: {dojang: dojang_id, kwanjang: instructor_id},
                                required: true
                            }
                        }
                    ]
                })) {return res.send("kwanjang_id is not related with dojang_id")}
                await models.InstructorClass.create({
                    kwanjang : instructor_id,
                    class: class_id
                })
            }
            
            if(instructor_type == "sabum"){
                if (!await models.Sabum.findOne({
                    where : {id : instructor_id}
                })){return res.send("Sabum_id not exist")}

                if(await models.InstructorClass.findOne({
                    where : {sabum: instructor_id, class: class_id}}))
                    {return res.send("sabum class already exist")}

                if(!await models.Sabum.findOne({
                    include : [
                        {
                            model: models.Dojang,
                            through: {
                                where: {dojang: dojang_id, sabum: instructor_id},
                                required: true
                            }
                        }
                    ]
                })){return res.send("sabum_id is not related with dojang_id")}

                await models.InstructorClass.create({
                    sabum : instructor_id,
                    class: class_id
                })
            }
            const data = await models.InstructorClass.findAll({
                where : {class:class_id},
                attributes: {
                    include: [
                        [sequelize.fn('date_format', sequelize.col('createdAt'), '%Y-%m-%d'), 'createdAt'],
                        [sequelize.fn('date_format', sequelize.col('updatedAt'), '%Y-%m-%d'), 'updatedAt'],
                    ]
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

    InstructorDeleteByTitle: async (req, res, next) => {
        // #swagger.description = "반 이름, 사부 종류(kwanjang / sabum), 사부 ID를 받아 해당 반의 사부를 삭제합니다. response는 해당 반의 해당 사부 정보가 반환됩니다""
        // #swagger.tags = ["관장"]
        // #swagger.summary = "사부 삭제"
        const class_id = req.params.class_id;
        const instructor_type = req.params.instructor_type;
        const instructor_id = req.params.instructor_id;

        try{
            if (!await models.Class.findOne({
                where : {id : class_id}
            })){return res.send("class_id not exist")}

            if (instructor_type == "kwanjang"){
                if(!await models.KwanjangInfo.findOne({
                    where: {id: instructor_id}
                })){return res.send("kwanjang_id not exist")}

                if(!await models.InstructorClass.findOne({
                    where : {kwanjang: instructor_id, class: class_id}}))
                    {return res.send("kwanjang class not exist")}

                await models.InstructorClass.destroy({
                    where: {
                        kwanjang : instructor_id,
                        class: class_id
                    }
                })
            } 
            else if (instructor_type == "sabum"){
                if(!await models.Sabum.findOne({
                    where: {id: instructor_id}
                })){return res.send("sabum_id not exist")}
                
                if(!await models.InstructorClass.findOne({
                    where : {sabum: instructor_id, class: class_id}}))
                    {return res.send("sabum class not exist")}

                await models.InstructorClass.destroy({
                    where: {
                        sabum : instructor_id,
                        class: class_id
                    }
                })
            }
            else {
                res.send("Wrong data")
            }
            const data = await models.InstructorClass.findAll({
                where : {class:class_id},
                attributes: {
                    include: [
                        [sequelize.fn('date_format', sequelize.col('createdAt'), '%Y-%m-%d'), 'createdAt'],
                        [sequelize.fn('date_format', sequelize.col('updatedAt'), '%Y-%m-%d'), 'updatedAt'],
                    ]
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

    InstructorRead: async (req, res, next) => {
        // #swagger.description = "도장 ID, 반 이름을 받아 해당 반을 담당하는 사부를 조회합니다."
        // #swagger.tags = ["관장"]
        // #swagger.summary = "반 담당 하는 사부 조회"
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

            let sabums = await models.Sabum.findAll({
                include: [{
                    model: models.Dojang,
                    where : {
                        id:dojang_id,
                        
                    },
                    through:{
                        attributes: []
                    },
                    attributes: ['id']
                },
                ],
                attributes: [
                        'id','last_name','first_name','photo_url','sex','phone_number',
                        [sequelize.fn('date_format', sequelize.col('dojang_reg_date'), '%Y-%m-%d'), 'dojang_reg_date'],
                        [sequelize.fn('date_format', sequelize.col('Sabum.createdAt'), '%Y-%m-%d'), 'createdAt'],
                        [sequelize.fn('date_format', sequelize.col('Sabum.updatedAt'), '%Y-%m-%d'), 'updatedAt'],
                    ],
                raw: true
            })
            
            for (let sabum of sabums){
                if(await models.InstructorClass.findOne({
                    where: {class: class_id, sabum: sabum.id}
                })
                ){
                    let sabum_info = await models.Sabum.findOne({
                        where :{id:sabum.id},
                        include : [
                            {
                                model: models.Class,
                                through: {
                                    attributes:[]
                                },
                                attributes: ['id', 'title']
                                
                            }
                        ],
                        raw: true
                    })
                    sabum_info['role'] = "sabum"
                    result.push(sabum_info)}
            }

            let kwanjangs = await models.KwanjangInfo.findAll({
                raw: true,
                include: [
                    {
                        model: models.Dojang,
                        through: {
                            attributes: []
                        },
                        where: {id: dojang_id},
                        attributes: ['id']
                    }
                ],
                attributes: [
                        'id','first_name','last_name','photo_url','sex','phone_number',
                        [sequelize.fn('date_format', sequelize.col('KwanjangInfo.createdAt'), '%Y-%m-%d'), 'createdAt'],
                        [sequelize.fn('date_format', sequelize.col('KwanjangInfo.updatedAt'), '%Y-%m-%d'), 'updatedAt'],
                    ],
                    group:"KwanjangInfo.id",
            })
            for (let kwanjang of kwanjangs){
                if(await models.InstructorClass.findOne({
                    where: {class: class_id, kwanjang: kwanjang.id}
                })
                ){
                    let kwanjang_info = await models.KwanjangInfo.findOne({
                        where :{id:kwanjang.id},
                        include : [
                            {
                                model: models.Class,
                                through: {
                                    attributes:[]
                                },
                                attributes: ['id', 'title']
                            }
                        ],
                        raw: true
                    })
                    kwanjang_info['role'] = 'kwanjang'
                    result.push(kwanjang_info)}
            }
            // let tempArr = []
            // result.forEach(el=>{
            //     tempArr.push(...el)
            // })
            res.send(result);
            // let data = [...kwanjangs, ...sabums];
            // res.send(result);
        }
        catch(err){
            res.status(500).send({
                message:
                    err.message || "some error occured"
            })
        }
    },

    InstructorReadExcept: async (req, res, next) => {
        // #swagger.description = "도장 ID, 반 이름을 받아 해당 반을 담당하지 않은 사부를 조회합니다."
        // #swagger.tags = ["관장"]
        // #swagger.summary = "반 담당 하지 않는 사부 조회"
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

            let sabums = await models.Sabum.findAll({
                include: [{
                        model: models.Dojang,
                        where : {
                            id:dojang_id,
                            
                        },
                        through:{
                            attributes: []
                        },
                        attributes: ['id']
                    },
                ],
                attributes: [
                        'id','last_name','first_name','photo_url','sex','phone_number',
                        [sequelize.fn('date_format', sequelize.col('dojang_reg_date'), '%Y-%m-%d'), 'dojang_reg_date'],
                        [sequelize.fn('date_format', sequelize.col('Sabum.createdAt'), '%Y-%m-%d'), 'createdAt'],
                        [sequelize.fn('date_format', sequelize.col('Sabum.updatedAt'), '%Y-%m-%d'), 'updatedAt'],
                    ],
                raw: true
            })
            
            for (let sabum of sabums){
                if(!await models.InstructorClass.findOne({
                    where: {class: class_id, sabum: sabum.id}
                })
                ){
                    let sabum_info = await models.Sabum.findOne({
                        where :{id:sabum.id},
                        include : [
                            {
                                model: models.Class,
                                through: {
                                    attributes:[]
                                },
                                attributes: ['id', 'title']
                            }
                        ],
                        raw: true
                    })
                    sabum_info['role'] = 'sabum'
                    result.push(sabum_info)
                }
            }

            let kwanjangs = await models.KwanjangInfo.findAll({
                // raw: true,
                include: [
                    {
                        model: models.Dojang,
                        through: {
                            attributes: []
                        },
                        where: {id: dojang_id},
                        attributes: ['id']
                    }
                ],
                attributes: [
                        'id','first_name','last_name','photo_url','sex','phone_number',
                        [sequelize.fn('date_format', sequelize.col('KwanjangInfo.createdAt'), '%Y-%m-%d'), 'createdAt'],
                        [sequelize.fn('date_format', sequelize.col('KwanjangInfo.updatedAt'), '%Y-%m-%d'), 'updatedAt'],
                    ],
                    group:"KwanjangInfo.id",
            })
            for (let kwanjang of kwanjangs){
                if(!await models.InstructorClass.findOne({
                    where: {class: class_id, kwanjang: kwanjang.id}
                })
                ){
                    let kwanjang_info = await models.KwanjangInfo.findOne({
                        where :{id:kwanjang.id},
                        include : [
                            {
                                model: models.Class,
                                through: {
                                    attributes:[]
                                },
                                attributes: ['id', 'title']
                            }
                        ],
                        raw: true
                    })
                    kwanjang_info['role'] = "kwanjang"
                    result.push(kwanjang_info)
                }
            }
            
            
            res.send(result)
            // let tempArr = []
            // result.forEach(el=>{
            //     tempArr.push(...el)
            // })
            // res.send(tempArr);
        }
        catch(err){
            res.status(500).send({
                message:
                    err.message || "some error occured"
            })
        }
    },
}
