const models = require("../models");
const { sequelize } = require('../models')
const Sequelize = require('sequelize');
const Op = Sequelize.Op;

const crypto = require("crypto");
const generateFileName = (bytes = 8) =>
    crypto.randomBytes(bytes).toString("hex");
const { uploadFile, getObjectSignedUrl, deleteFile } = require("../util/s3.js");

const {fnImgUpload} = require("../controller/utilController")
const { sign, refresh } = require('../util/jwt-util');
const bcrypt = require("bcrypt")
const authJwt = require('../util/authJWT');
const jwt = require('jsonwebtoken');
const { TableHints } = require("sequelize");
const swaggerAutogen = require("swagger-autogen");
const registerKwanJang = require("../controller/kwanjangController");
const schedule = require("../models/schedule");
const secret = "Hello";

const DEFAULT_DOJANG_URL = "dojang/default_dojang_logo.png"

module.exports = {
    //dojang
    DojangCreate: async (req,res,next) => {
        // #swagger.description = "도장을 생성합니다."
        // #swagger.tags = ["도장"]
        // #swagger.summary = "도장 생성"
        try{
            let auth_id = req.id
            let auth_role = req.role
            let FILE_logo_img = req.files['logo'];
            let FILE_BR = req.files['BR_img'];
            let FILE_sign = req.files['sign'];
            let logo_url = []
            let BR_url = []
            let sign_url = []

            if(auth_role != 'KWANJANG'){
                return res.send("You are not authorized")
            }
            let user_info = await models.UserAccount.findOne({
                where: {id: auth_id},
                raw:true
            })
            //관장이 도장을 처음 만드는 경우(접속된 핸드폰 정보로 관장 특정)
            let kwanjang_info = await models.KwanjangInfo.findOne({
                where: {phone_number: user_info.phone_number},
                attributes:['id'],
                raw:true
            })

            const { name, phone_number, address_name, address_detail, kwanjang, BR_number, signature} = req.body;
            let password = Math.random().toString(36).slice(-8);

            if(FILE_logo_img){
                for ( var i = 0; i < FILE_logo_img.length; i++){
                    let imageName = generateFileName();
                    if(await models.UrlGroup.findOne({
                        where: {urls:"dojang/logo/"+imageName}
                    })){imageName = generateFileName();}
                    imageName = "dojang/logo/"+imageName
                    await models.UrlGroup.create({urls:imageName}) //url group에 늘리기
                    await uploadFile(FILE_logo_img[i].buffer, imageName, FILE_logo_img[i].mimetype)
                    logo_url.push(imageName)
                }
            }
            else{
                logo_url.push(DEFAULT_DOJANG_URL)
            }
            if(FILE_BR){
                for ( var i = 0; i < FILE_BR.length; i++){
                    let imageName = generateFileName();
                    if(await models.UrlGroup.findOne({
                        where: {urls:"dojang/BR/"+imageName}
                    })){imageName = generateFileName();}
                    imageName = "dojang/BR/"+imageName
                    await models.UrlGroup.create({urls:imageName}) //url group에 늘리기
                    await uploadFile(FILE_BR[i].buffer, imageName, FILE_BR[i].mimetype)
                    BR_url.push(imageName)
                }
            }
            if(FILE_sign){
                for ( var i = 0; i < FILE_sign.length; i++){
                    let imageName = generateFileName();
                    if(await models.UrlGroup.findOne({
                        where: {urls:"dojang/sign/"+imageName}
                    })){imageName = generateFileName();}
                    imageName = "dojang/sign/"+imageName
                    await models.UrlGroup.create({urls:imageName}) //url group에 늘리기
                    await uploadFile(FILE_sign[i].buffer, imageName, FILE_sign[i].mimetype)
                    sign_url.push(imageName)
                }
            }
            logo_url = JSON.stringify(logo_url)
            BR_url = JSON.stringify(BR_url)
            sign_url = JSON.stringify(sign_url)

            if(logo_url.length == 2){
                logo_url = null
            }
            if(BR_url.length == 2){
                BR_url = null
            }
            if(sign_url.length == 2){
                sign_url = null
            }

            const dojang_new = await models.Dojang.create({ name, password: password, phone_number, 
                address_name, address_detail, kwanjang, BR_number, signature,
                logo_img : logo_url, signature : sign_url, BR: BR_url, is_alive: 1
            })
            await models.KwanjangDojang.create({
                kwanjang: kwanjang_info.id, dojang: dojang_new.id
            })
            //관장과 유저 연결
            await models.KwanjangInfo.update(
                {
                    user: auth_id
                },
                {
                    where: {phone_number: user_info.phone_number},
                }
            )
            //Default 급/띠 생성
            await models.LevelInfo.create({
                dojang_fk_id: dojang_new.id, dojang_fk_id_backup: dojang_new.id, 
                level_name: "9급", belt_name: "흰띠", belt_type: "1", 
                first_line: "#FFFFFF", second_line: "",
                third_line: "", is_star: false, belt_img_url: "dojang/belt_img/default_9geub",
                is_poom_dan: 0
            })
            await models.LevelInfo.create({
                dojang_fk_id: dojang_new.id, dojang_fk_id_backup: dojang_new.id, 
                level_name: "8급", belt_name: "노란띠", belt_type: "1", 
                first_line: "#FFF000", second_line: "",
                third_line: "", is_star: false, belt_img_url: "dojang/belt_img/default_8geub",
                is_poom_dan: 0
            })
            await models.LevelInfo.create({
                dojang_fk_id: dojang_new.id, dojang_fk_id_backup: dojang_new.id, 
                level_name: "7급", belt_name: "주황띠", belt_type: "1", 
                first_line: "#FF6600", second_line: "",
                third_line: "", is_star: false, belt_img_url: "dojang/belt_img/default_7geub",
                is_poom_dan: 0
            })
            await models.LevelInfo.create({
                dojang_fk_id: dojang_new.id, dojang_fk_id_backup: dojang_new.id, 
                level_name: "6급", belt_name: "초록띠", belt_type: "1", 
                first_line: "#00CC00", second_line: "",
                third_line: "", is_star: false, belt_img_url: "dojang/belt_img/default_6geub",
                is_poom_dan: 0
            })
            await models.LevelInfo.create({
                dojang_fk_id: dojang_new.id, dojang_fk_id_backup: dojang_new.id, 
                level_name: "5급", belt_name: "파란띠", belt_type: "1", 
                first_line: "#1F00B2", second_line: "",
                third_line: "", is_star: false, belt_img_url: "dojang/belt_img/default_5geub",
                is_poom_dan: 0
            })
            await models.LevelInfo.create({
                dojang_fk_id: dojang_new.id, dojang_fk_id_backup: dojang_new.id, 
                level_name: "4급", belt_name: "보라띠", belt_type: "1", 
                first_line: "#7100A7", second_line: "",
                third_line: "", is_star: false, belt_img_url: "dojang/belt_img/default_4geub",
                is_poom_dan: 0
            })
            await models.LevelInfo.create({
                dojang_fk_id: dojang_new.id, dojang_fk_id_backup: dojang_new.id, 
                level_name: "3급", belt_name: "밤띠", belt_type: "1", 
                first_line: "#682B00", second_line: "",
                third_line: "", is_star: false, belt_img_url: "dojang/belt_img/default_3geub",
                is_poom_dan: 0
            })
            await models.LevelInfo.create({
                dojang_fk_id: dojang_new.id, dojang_fk_id_backup: dojang_new.id, 
                level_name: "2급", belt_name: "빨간띠", belt_type: "1", 
                first_line: "#E40007", second_line: "",
                third_line: "", is_star: false, belt_img_url: "dojang/belt_img/default_2geub",
                is_poom_dan: 0
            })
            await models.LevelInfo.create({
                dojang_fk_id: dojang_new.id, dojang_fk_id_backup: dojang_new.id, 
                level_name: "1급", belt_name: "빨검띠", belt_type: "3", 
                first_line: "#E40007", second_line: "#000000",
                third_line: "#E40007", is_star: false, 
                belt_img_url: "dojang/belt_img/default_1geub",
                is_poom_dan: 0
            })
            await models.LevelInfo.create({
                dojang_fk_id: dojang_new.id, dojang_fk_id_backup: dojang_new.id, 
                level_name: "1품", belt_name: "품띠", belt_type: "2", 
                first_line: "#E40007", second_line: "#000000",
                third_line: "", is_star: false, 
                belt_img_url: "dojang/belt_img/default_poom",
                is_poom_dan: 1
            })
            await models.LevelInfo.create({
                dojang_fk_id: dojang_new.id, dojang_fk_id_backup: dojang_new.id, 
                level_name: "2품", belt_name: "품띠", belt_type: "2", 
                first_line: "#E40007", second_line: "#000000",
                third_line: "", is_star: false, 
                belt_img_url: "dojang/belt_img/default_poom",
                is_poom_dan: 1
            })
            await models.LevelInfo.create({
                dojang_fk_id: dojang_new.id, dojang_fk_id_backup: dojang_new.id, 
                level_name: "3품", belt_name: "품띠", belt_type: "2", 
                first_line: "#E40007", second_line: "#000000",
                third_line: "", is_star: false, 
                belt_img_url: "dojang/belt_img/default_poom",
                is_poom_dan: 1
            })
            await models.LevelInfo.create({
                dojang_fk_id: dojang_new.id, dojang_fk_id_backup: dojang_new.id, 
                level_name: "1단", belt_name: "검은띠", belt_type: "1", 
                first_line: "#000000", second_line: "",
                third_line: "", is_star: false, 
                belt_img_url: "dojang/belt_img/default_dan",
                is_poom_dan: 1
            })
            await models.LevelInfo.create({
                dojang_fk_id: dojang_new.id, dojang_fk_id_backup: dojang_new.id, 
                level_name: "2단", belt_name: "검은띠", belt_type: "1", 
                first_line: "#000000", second_line: "",
                third_line: "", is_star: false, 
                belt_img_url: "dojang/belt_img/default_dan",
                is_poom_dan: 1
            })
            await models.LevelInfo.create({
                dojang_fk_id: dojang_new.id, dojang_fk_id_backup: dojang_new.id, 
                level_name: "3단", belt_name: "검은띠", belt_type: "1", 
                first_line: "#000000", second_line: "",
                third_line: "", is_star: false, 
                belt_img_url: "dojang/belt_img/default_dan",
                is_poom_dan: 1
            })

            res.send("Dojang Successfully created")
        }
        catch(err){
            res.status(500).send({
                message:
                    err.message || "some error occured"
            })
        }
    },
    
    DojangRead: async (req,res,next) => {
        // #swagger.description = "도장을 조회합니다. id가 0이면 모두 검색, 0이 아닐 시 해당 id만 검색합니다."
        // #swagger.tags = ["도장"]
        // #swagger.summary = "도장 조회"
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
            offset = 7 * (pageNum - 1);
        }
        try{
            if (dojang_id!=0) { // id 0이 아닐 때 하나 찾기
                const dojang_info = await models.Dojang.findOne({
                    where: {
                        id: dojang_id   
                    },
                    attributes: {
                        include: [
                            [sequelize.fn('date_format', sequelize.col('Dojang.createdAt'), '%Y-%m-%d'), 'createdAt'],
                            [sequelize.fn('date_format', sequelize.col('Dojang.updatedAt'), '%Y-%m-%d'), 'updatedAt'],
                        ],
                    },
                    raw: true
                })
                // console.log(dojang_info,"dojang_info")
                const sabumdojang_info = await models.SabumDojang.findAll({
                    where : {dojang: dojang_id},
                    attributes: ['sabum'],
                    raw:true
                })
                // console.log(sabumdojang_info,"sabumdojang_info")
                let sabum_arr = []
                for(let el of sabumdojang_info){
                    
                    let sabum_info = await models.Sabum.findAll({
                        where: {id: el.sabum},
                        attributes: ['id','first_name','last_name','photo_url','phone_number','level'],
                        raw: true
                    })
                    sabum_arr.push(sabum_info[0])
                }
                let kwanjangdojang_info = await models.KwanjangDojang.findAll({
                    where : {dojang: dojang_id},
                    attributes: ['kwanjang'],
                    raw:true
                })
                let kwanjang_arr = []
                for(let el of kwanjangdojang_info){
                    let kwanjang_info = await models.KwanjangInfo.findAll({
                        where: {id: el.kwanjang},
                        attributes: ['id','first_name','last_name','photo_url','phone_number','level'],
                        raw: true
                    })
                    kwanjang_arr.push(kwanjang_info[0])
                }
                // console.log(sabum_arr,"sabum_arr")
                // console.log(dojang_info,"dojang_info")
                dojang_info["sabum_info"] = sabum_arr
                dojang_info["kwanjang_info"] = kwanjang_arr
                // data.forEach(el=>el['Sabums.SabumDojangs.createdAt'] = el['Sabums.SabumDojangs.createdAt'].toISOString().split('T')[0])
                // data.forEach(el=>el['Sabums.SabumDojangs.updatedAt'] = el['Sabums.SabumDojangs.updatedAt'].toISOString().split('T')[0])
            
                res.send(dojang_info)
            }
            else if(dojang_id==0) { // id == 0 이면 모두 찾기
                const dojang_info = await models.Dojang.findAll({
                    attributes: {
                        include: [
                            [sequelize.fn('date_format', sequelize.col('Dojang.createdAt'), '%Y-%m-%d'), 'createdAt'],
                            [sequelize.fn('date_format', sequelize.col('Dojang.updatedAt'), '%Y-%m-%d'), 'updatedAt'],
                        ],
                    },
                    raw: true
                })
                console.log(dojang_info,"dojang_info")
                for(let dojang of dojang_info){
                    const sabumdojang_info = await models.SabumDojang.findAll({
                        where : {dojang: dojang.id},
                        attributes: ['sabum'],
                        raw:true
                    })
                    console.log(sabumdojang_info,"sabumdojang_info")
                    let sabum_arr = []
                    for(let el of sabumdojang_info){
                        let sabum_info = await models.Sabum.findAll({
                            where: {id: el.sabum},
                            attributes: ['id','first_name','last_name','photo_url','phone_number','level'],
                            raw: true
                        })
                        sabum_arr.push(sabum_info[0])
                    }
                    const kwanjangdojang_info = await models.KwanjangDojang.findAll({
                        where : {dojang: dojang.id},
                        attributes: ['kwanjang'],
                        raw:true
                    })
                    let kwanjang_arr = []
                    for(let el of kwanjangdojang_info){
                        let kwanjang_info = await models.KwanjangInfo.findAll({
                            where: {id: el.kwanjang},
                            attributes: ['id','first_name','last_name','photo_url','phone_number','level'],
                            raw: true
                        })
                        kwanjang_arr.push(kwanjang_info[0])
                    }
                    // console.log(sabum_arr,"sabum_arr")
                    // console.log(dojang,"dojang_info")
                    dojang["sabum_info"] = sabum_arr
                }
                
                // data.forEach(el=>el['Sabums.SabumDojangs.createdAt'] = el['Sabums.SabumDojangs.createdAt'].toISOString().split('T')[0])
                // data.forEach(el=>el['Sabums.SabumDojangs.updatedAt'] = el['Sabums.SabumDojangs.updatedAt'].toISOString().split('T')[0])
            
                res.send(dojang_info)
            }
        }
        catch(err){
            await res.status(500).send({
                message:
                    err.message || "some error occured"
            })
        }
    },

    DojangReadApp: async (req,res,next) => {
        // #swagger.description = "도장을 조회합니다. app전용으로 관장, 사범정보까지 조회합니다."
        // #swagger.tags = ["도장"]
        // #swagger.summary = "도장 조회"
        
        dojang_id = req.params.dojang_id;
        
        try{
            const dojang_info = await models.Dojang.findAll({
            where: {
                id: dojang_id   
            },
            attributes: ['id','name','logo_img','phone_number','address_name','address_detail'],
            raw: true
            })
            const sabum_info = await models.Sabum.findAll({
                raw: true,
                include:[
                    {
                        model: models.Dojang,
                        through: {
                            where: {dojang:dojang_id},
                            attributes: [],
                            
                        },
                        attributes: ['id'],
                        required: true
                    },
                    
                ],
                attributes: ['id','photo_url','last_name','first_name','phone_number','level']
            })
            const kwanjang_info = await models.KwanjangInfo.findAll({
                raw: true,
                include:[
                    {
                        model: models.Dojang,
                        through: {
                            where: {dojang:dojang_id},
                            attributes: []
                        },
                        attributes: ['id'],
                        required: true
                    }
                ],
                attributes: ['id','photo_url','last_name','first_name','phone_number','level']
            })
            dojang_info[0]["sabum"] = sabum_info
            dojang_info[0]["kwanjang"] = kwanjang_info

            res.send(dojang_info)
        }
        catch(err){
            await res.status(500).send({
                message:
                    err.message || "some error occured"
            })
        }
    },

    DojangUpdate: async (req,res) => {
        // #swagger.description = "도장을 수정합니다."
        // #swagger.tags = ["도장"]
        // #swagger.summary = "도장 수정"
        try{
            console.log(req.files,"req.files")
            const dojang_id = req.params.dojang_id;
            let { name, phone_number,
                address_name, road_address, region_1depth_name, region_2depth_name, 
                region_3depth_name, address_detail, BR_number, delLogoname,
                delBRname, delSignname  } = req.body;
            let FILE_logo_img = req.files['logo'];
            let FILE_BR = req.files['BR_img'];
            let FILE_sign = req.files['sign']; 
            let logo_url = []
            let BR_url = []
            let sign_url = []
            //기존 파일들 뽑아냄
            defaultPhoto = await models.Dojang.findOne({
                where: {id:dojang_id},
                attributes: ['logo_img','BR','signature'],
                raw: true
            })
            //logo
            //해당 키의 파일이 있을때만 실행
            if(FILE_logo_img){
                //원래 파일이 있으면 지우고 원래 파일 가공
                if(defaultPhoto.logo_img){
                    default_logo = JSON.parse(defaultPhoto.logo_img)
                    
                    if(default_logo != DEFAULT_DOJANG_URL){
                        await deleteFile(default_logo)
                    }
                    await models.UrlGroup.destroy({ //url group에서 삭제하기
                        where: {urls: default_logo}
                    })
                    //기본 배열 초기화 (파일 하나기 때문에)
                    default_logo=[]; 
                    logo_url = default_logo
                    // logo_url = JSON.parse(logo_url)
                }
                //원래 파일이 없다면 빈 배열 부여
                if(!logo_url){
                    logo_url = []
                }
                //받은 파일이 있으니 파일 생성 // array or fields면 file.length가 가능
                for ( var i = 0; i < FILE_logo_img.length; i++){
                    let imageName = generateFileName();
                    if(await models.UrlGroup.findOne({
                        where: {urls:"dojang/logo/"+imageName}
                    })){imageName = generateFileName();}
                    imageName = "dojang/logo/"+imageName
                    await models.UrlGroup.create({urls:imageName}) //url group에 늘리기
                    await uploadFile(FILE_logo_img[i].buffer, imageName, FILE_logo_img[i].mimetype)
                    logo_url.push(imageName)
                }
                //저장을 위한 문자화
                logo_url = JSON.stringify(logo_url)
                //따로 따로 업데이트
                if(logo_url.length == 2){
                    await models.Dojang.update(
                        { 
                            logo_img: null       
                        },
                        {
                            where : { id: dojang_id }
                        } 
                    )
                }
                else{
                    await models.Dojang.update(
                        { 
                            logo_img: logo_url          
                        },
                        {
                            where : { id: dojang_id }
                        } 
                    )
                }
                
            }
            else if(delLogoname){
                default_logo = JSON.parse(defaultPhoto.logo_img)
                delLogoname= JSON.parse(delLogoname)
                for(let del of delLogoname){
                    for(let i=0; i< default_logo.length; i++){
                        if(del == default_logo[i]){
                            await deleteFile(default_logo[i]),
                            await models.UrlGroup.destroy({ //url group에서 삭제하기
                                where: {urls: default_logo[i]}
                            })
                            default_logo.splice(i, 1); 
                            i--; 
                        }
                    }
                }
                logo_url = default_logo
                //저장을 위한 문자화
                logo_url = JSON.stringify(logo_url)
                //따로 따로 업데이트
                if(logo_url.length == 2){
                    await models.Dojang.update(
                        {logo_img : null},
                        {where: {id : dojang_id}}
                    )
                }
                else{
                    await models.Dojang.update(
                        {logo_img:logo_url},
                        {where: {id : dojang_id}}
                    )
                }
            }
            //BR
            //해당 키의 파일이 있을때만 실행
            if(FILE_BR){
                //원래 파일이 있으면 지우고 원래 파일 가공
                if(defaultPhoto.BR){
                    default_BR = JSON.parse(defaultPhoto.BR)
                    await deleteFile(default_BR),
                    await models.UrlGroup.destroy({ //url group에서 삭제하기
                        where: {urls: default_BR}
                    })
                    default_BR=[]; 
                    BR_url = default_BR
                    // BR_url = JSON.parse(BR_url)
                }
                //원래 파일이 없다면 빈 배열 부여
                if(!BR_url){
                    BR_url = []
                }
                //받은 파일이 있으니 파일 생성
                for ( var i = 0; i < FILE_BR.length; i++){
                    let imageName = generateFileName();
                    if(await models.UrlGroup.findOne({
                        where: {urls:"dojang/BR/"+imageName}
                    })){imageName = generateFileName();}
                    imageName = "dojang/BR/"+imageName
                    await models.UrlGroup.create({urls:imageName}) //url group에 늘리기
                    await uploadFile(FILE_BR[i].buffer, imageName, FILE_BR[i].mimetype)
                    BR_url.push(imageName)
                }
                 //저장을 위한 문자화
                BR_url = JSON.stringify(BR_url)
                //따로 따로 업데이트
                if(BR_url.length == 2){
                    await models.Dojang.update(
                        { 
                            BR: null          
                        },
                        {
                            where : { id: dojang_id }
                        } 
                    )
                }
                else{
                    await models.Dojang.update(
                        { 
                            BR: BR_url          
                        },
                        {
                            where : { id: dojang_id }
                        } 
                    )
                }
                
            }
            else if(delBRname){
                default_BR = JSON.parse(defaultPhoto.BR)
                delBRname= JSON.parse(delBRname)
                for(let del of delBRname){
                    for(let i=0; i< default_BR.length; i++){
                        if(del == default_BR[i]){
                            await deleteFile(default_BR[i]),
                            await models.UrlGroup.destroy({ //url group에서 삭제하기
                                where: {urls: default_BR[i]}
                            })
                            default_BR.splice(i, 1); 
                            i--; 
                        }
                    }
                }
                BR_url = default_BR
                //저장을 위한 문자화
                BR_url = JSON.stringify(BR_url)
                //따로 따로 업데이트
                if(BR_url.length == 2){
                    await models.Dojang.update(
                        {BR : null},
                        {where: {id : dojang_id}}
                    )
                }
                else{
                    await models.Dojang.update(
                        {BR:BR_url},
                        {where: {id : dojang_id}}
                    )
                }
            }
            //signature
            //해당 키의 파일이 있을때만 실행
            if(FILE_sign){
                //원래 파일이 있으면 지우고 원래 파일 가공
                if(defaultPhoto.signature){
                    default_sign = JSON.parse(defaultPhoto.signature)
                    await deleteFile(default_sign),
                    await models.UrlGroup.destroy({ //url group에서 삭제하기
                        where: {urls: default_sign}
                    })
                    default_sign=[]; 
                    sign_url = default_sign
                    // sign_url = JSON.parse(sign_url)
                }
                //원래 파일이 없다면 빈 배열 부여
                if(!sign_url){
                    sign_url = []
                }
                //받은 파일이 있으니 파일 생성
                for ( var i = 0; i < FILE_sign.length; i++){
                    let imageName = generateFileName();
                    if(await models.UrlGroup.findOne({
                        where: {urls:"dojang/sign/"+imageName}
                    })){imageName = generateFileName();}
                    imageName = "dojang/sign/"+imageName
                    await models.UrlGroup.create({urls:imageName}) //url group에 늘리기
                    await uploadFile(FILE_sign[i].buffer, imageName, FILE_sign[i].mimetype)
                    sign_url.push(imageName)
                }
                 //저장을 위한 문자화
                sign_url = JSON.stringify(sign_url)
                //따로 따로 업데이트
                if(sign_url.length == 2){
                    await models.Dojang.update(
                        { 
                            signature: null      
                        },
                        {
                            where : { id: dojang_id }
                        } 
                    )
                }
                else{
                    await models.Dojang.update(
                        { 
                            signature: sign_url          
                        },
                        {
                            where : { id: dojang_id }
                        } 
                    )
                }
            }
            else if(delSignname){
                default_sign = JSON.parse(defaultPhoto.signature)
                delSignname= JSON.parse(delSignname)
                for(let del of delSignname){
                    for(let i=0; i< default_sign.length; i++){
                        if(del == default_sign[i]){
                            await deleteFile(default_sign[i]),
                            await models.UrlGroup.destroy({ //url group에서 삭제하기
                                where: {urls: default_sign[i]}
                            })
                            default_sign.splice(i, 1); 
                            i--; 
                        }
                    }
                }
                sign_url = default_sign
                //저장을 위한 문자화
                sign_url = JSON.stringify(sign_url)
                //따로 따로 업데이트
                if(sign_url.length == 2){
                    await models.Dojang.update(
                        {signature : null},
                        {where: {id : dojang_id}}
                    )
                }
                else{
                    await models.Dojang.update(
                        {signature:sign_url},
                        {where: {id : dojang_id}}
                    )
                }
            }
            //data
            await models.Dojang.update(
            { 
                name, phone_number, address_name, road_address, 
                region_1depth_name, region_2depth_name, 
                region_3depth_name, address_detail, 
                BR_number,         
            },
            {
                where : { id: dojang_id }
            } 
            )
            res.send("Dojang Successfully updated")
        }
        catch(err){
            res.status(500).send({
                message:
                    err.message || "some error occured"
            })
        }
    },

    DojangDelete: async (req,res) => {
        // #swagger.description = "도장을 지웁니다."
        // #swagger.tags = ["도장"]
        // #swagger.summary = "도장 삭제"
        try{
            const dojang_id = req.params.dojang_id;
            const today = new Date()
            student_info = await models.StudentInfo.findOne({
                where : { dojang : dojang_id },
                raw:true
            })
            if(student_info){return res.send("student exist")}
            sabum_info = await models.SabumDojang.findOne({
                where : { dojang : dojang_id },
                raw:true
            })
            if(sabum_info){return res.send("sabum exist")}

            let kwanjangdojang_info = await models.KwanjangDojang.findAll({
                where: {dojang: dojang_id},
                attributes: ['kwanjang','createdAt'],
                raw:true
            })
            let dojang_info = await models.Dojang.findOne({
                where: {id: dojang_id},
                attributes: ['name'],
                raw:true
            })
            for(let kwanjangdojang_one of kwanjangdojang_info){
                let kwanjang_info = await models.KwanjangInfo.findOne({
                    where: {id: kwanjangdojang_one.kwanjang},
                    attributes: ['id','level','last_name','first_name']
                })
                await models.Kwanjang_log.create({
                    kwanjang_user_id: kwanjangdojang_one.kwanjang, last_name:kwanjang_info.last_name,
                    first_name:kwanjang_info.first_name, dojang: dojang_id,
                    dojang_start_date: kwanjangdojang_one.createdAt,
                    dojang_end_date: today, dojang_name: dojang_info.name,
                    level: kwanjang_info.level
                })
            }

            await models.KwanjangDojang.destroy({
                where : { dojang : dojang_id }
            })
            await models.Dojang.update(
                { 
                    is_alive: 0       
                },
                {
                    where : { id: dojang_id }
                } 
                )
            return res.send('successfully deleted!!')
        }
        catch(err){
            await res.status(500).send({
                message:
                    err.message || "some error occured"
            })
        }
    },

    DojangSelect: async (req,res) => {
        // #swagger.description = "관장 또한 사범이 로그인시 도장을 선택하기 위한 용도입니다."
        // #swagger.tags = ["도장"]
        // #swagger.summary = "도장 선택"
        try{
            const auth_id = req.id
            const auth_role = req.role
            console.log(auth_id,"auth_id")
            if(auth_role == 'KWANJANG'){
                result_arr = []
                let kwanjang_info = await models.KwanjangInfo.findOne({
                    where: {user: auth_id},
                    attributes: ['id','last_name','first_name'],
                    raw: true
                })
                if(!kwanjang_info){
                    return res.send([])
                }
                let kwanjangdojang_info = await models.KwanjangDojang.findAll({
                    where: {kwanjang: kwanjang_info.id},
                    attributes: ['dojang','createdAt'],
                    raw: true,
                    order: [['createdAt','asc']],
                })
                for(let el of kwanjangdojang_info){
                    //각 도장의 첫번째 관장 조회
                    let kwanjangdojang_info_2 = await models.KwanjangDojang.findAll({
                        where: {dojang: el.dojang},
                        attributes: ['kwanjang','createdAt'],
                        raw: true,
                        order: [['createdAt','asc']],
                    })
                    let kwanjang_info_2 = await models.KwanjangInfo.findOne({
                        where: {id: kwanjangdojang_info_2[0].kwanjang},
                        attributes: ['id','last_name','first_name'],
                        raw:true
                    })

                    let dojang_info = await models.Dojang.findOne({
                        where: {id: el.dojang, is_alive: 1},
                        attributes: ['id','name','logo_img','phone_number','address_name','road_address','address_detail'],
                        raw: true
                    })
                    let sabumdojang_info = await models.SabumDojang.findAll({
                        where: {dojang: el.dojang},
                        attributes: ['sabum'],
                        raw: true
                    })
                    let student_info = await models.StudentInfo.findAll({
                        where: {dojang: el.dojang},
                        attributes: ['id'],
                        raw: true
                    })
                    console.log(sabumdojang_info.length,"sabumdojang_info.length")
                    dojang_info['kwanjang_last_name'] = kwanjang_info_2.last_name
                    dojang_info['kwanjang_first_name'] = kwanjang_info_2.first_name
                    dojang_info['sabum_count'] = sabumdojang_info.length
                    dojang_info['student_count'] = student_info.length
                    result_arr.push(dojang_info)
                }
                return res.send(result_arr)
            }
            else if(auth_role == 'SABUM'){
                result_arr = []
                let sabum_info = await models.Sabum.findOne({
                    where: {user: auth_id},
                    attributes: ['id','last_name','first_name'],
                    raw: true
                })
                if(!sabum_info){
                    return res.send([])
                }
                let sabumdojang_info = await models.SabumDojang.findAll({
                    where: {sabum: sabum_info.id},
                    attributes: ['dojang','createdAt'],
                    raw: true,
                    order: [['createdAt','asc']]
                })
                for(let el of sabumdojang_info){
                    //각 도장의 첫번째 관장 조회
                    let kwanjangdojang_info_2 = await models.KwanjangDojang.findAll({
                        where: {dojang: el.dojang},
                        attributes: ['kwanjang','createdAt'],
                        raw: true,
                        order: [['createdAt','asc']],
                    })
                    let kwanjang_info_2 = await models.KwanjangInfo.findOne({
                        where: {id: kwanjangdojang_info_2[0].kwanjang},
                        attributes: ['id','last_name','first_name'],
                        raw:true
                    })

                    let dojang_info = await models.Dojang.findOne({
                        where: {id: el.dojang, is_alive: 1},
                        attributes: ['id','name','logo_img','phone_number','address_name','road_address','address_detail'],
                        raw: true
                    })
                    let sabumdojang_info = await models.SabumDojang.findAll({
                        where: {dojang: el.dojang},
                        attributes: ['sabum'],
                        raw: true
                    })
                    let student_info = await models.StudentInfo.findAll({
                        where: {dojang: el.dojang},
                        attributes: ['id'],
                        raw: true
                    })
                    console.log(sabumdojang_info.length,"sabumdojang_info.length")
                    dojang_info['kwanjang_last_name'] = kwanjang_info_2.last_name
                    dojang_info['kwanjang_first_name'] = kwanjang_info_2.first_name
                    dojang_info['sabum_count'] = sabumdojang_info.length
                    dojang_info['student_count'] = student_info.length
                    result_arr.push(dojang_info)
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

    ScheduleCreate: async (req,res) => {
        // #swagger.description = "일정을 추가합니다."
        // #swagger.tags = ["일정"]
        // #swagger.summary = "일정 추가"
        try{
            const dojang_id = req.params.dojang_id

            let { category, title, contents, start_date, end_date} = req.body
            await models.Schedule.create({
                dojang: dojang_id, category, title, contents, start_date, end_date
            }).then(res.send("successfully created"))
        }
        catch(err){
            await res.status(500).send({
                message:
                    err.message || "some error occured"
            })
        }
    },

    ScheduleRead: async (req,res) => {
        // #swagger.description = "일정을 모두 조회합니다."
        // #swagger.tags = ["일정"]
        // #swagger.summary = "일정 조회"
        try{
            const dojang_id = req.params.dojang_id
            const schedule_id = req.params.schedule_id
            
            if(schedule_id == 0){
                let scheduel_info = await models.Schedule.findAll({
                    where: {dojang: dojang_id},
                    attributes: ['id', 'dojang', 'category', 'title', 'contents', 'start_date', 'end_date'],
                    raw:true
                })
                return res.send(scheduel_info)
            }
            else if(schedule_id != 0){
                let scheduel_info = await models.Schedule.findOne({
                    where: {id: schedule_id},
                    attributes: ['id', 'dojang', 'category', 'title', 'contents', 'start_date', 'end_date'],
                    raw:true
                })
                return res.send(scheduel_info)
            }
        }
        catch(err){
            await res.status(500).send({
                message:
                    err.message || "some error occured"
            })
        }
    },

    ScheduleReadByMonth: async (req,res) => {
        // #swagger.description = "월별로 일정을 모두 조회합니다."
        // #swagger.tags = ["일정"]
        // #swagger.summary = "일정 월별 조회"
        try{
            const dojang_id = req.params.dojang_id
            const year = req.params.year
            const month = req.params.month
            
            let schedule_info = await models.Schedule.findAll({
                where: {dojang: dojang_id, 
                        [Op.or]: [
                            {
                                start_date : sequelize.where(sequelize.fn('YEAR', sequelize.col('start_date')), year),
                                [Op.and]: sequelize.where(sequelize.fn('MONTH', sequelize.col('start_date')), month),
                            },
                            {
                                end_date : sequelize.where(sequelize.fn('YEAR', sequelize.col('end_date')), year),
                                [Op.and]: sequelize.where(sequelize.fn('MONTH', sequelize.col('end_date')), month),
                            }
                        ]
                    },
                    attributes: ['id', 'dojang', 'category', 'title', 'contents', 'start_date', 'end_date'],
                    raw:true
            })
            return res.send(schedule_info)
        }
        catch(err){
            await res.status(500).send({
                message:
                    err.message || "some error occured"
            })
        }
    },

    ScheduleReadDate: async (req,res) => {
        // #swagger.description = "날짜에 해당하는 일정을 조회합니다."
        // #swagger.tags = ["일정"]
        // #swagger.summary = "해당 날짜 일정 조회"
        try{
            const dojang_id = req.params.dojang_id
            const date = req.params.date

            let schedule_info = await models.Schedule.findAll({
                where: {dojang: dojang_id, 
                        [Op.and]: [
                            {
                                start_date : {[Op.lte]: date} 
                            },
                            {
                                end_date : {[Op.gte]: date} 
                            }
                        ]
                    },
                    attributes: ['id', 'dojang', 'category', 'title', 'contents', 'start_date', 'end_date'],
                    raw:true
            })
            return res.send(schedule_info)
        }
        catch(err){
            await res.status(500).send({
                message:
                    err.message || "some error occured"
            })
        }
    },

    ScheduleReadUpcoming: async (req,res) => {
        // #swagger.description = "다가올 일정을 조회합니다."
        // #swagger.tags = ["일정"]
        // #swagger.summary = "다가올 일정 조회"
        try{
            const dojang_id = req.params.dojang_id
            const today = new Date()

            let schedule_info = await models.Schedule.findAll({
                where: {dojang: dojang_id, 
                        start_date : {[Op.gt]: today} 
                    },
                    attributes: ['id', 'dojang', 'category', 'title', 'contents', 'start_date', 'end_date'],
                    raw:true,
                    order: [['start_date','asc']],
            })
            return res.send(schedule_info)
        }
        catch(err){
            await res.status(500).send({
                message:
                    err.message || "some error occured"
            })
        }
    },

    ScheduleUpdate: async (req,res) => {
        // #swagger.description = "일정을 수정합니다."
        // #swagger.tags = ["일정"]
        // #swagger.summary = "일정 수정"
        try{
            const schedule_id = req.params.schedule_id
            let {category, title, contents, start_date, end_date} = req.body

            await models.Schedule.update(
                {
                    category, title, contents, start_date, end_date
                },
                {
                    where: {id: schedule_id}
                }
            ).then(res.send("successfully updated"))
        }
        catch(err){
            await res.status(500).send({
                message:
                    err.message || "some error occured"
            })
        }
    },

    ScheduleDelete: async (req,res) => {
        // #swagger.description = "일정을 삭제합니다."
        // #swagger.tags = ["일정"]
        // #swagger.summary = "일정 삭제"
        try{
            const schedule_id = req.params.schedule_id

            await models.Schedule.destroy({
                where:{id : schedule_id}
            }).then(res.send("successfully deleted"))
        }
        catch(err){
            await res.status(500).send({
                message:
                    err.message || "some error occured"
            })
        }
    },

    Cal_Dojang_Home_User_Year: async (req,res) => {
        // #swagger.description = "도장 홈 월별 수련생 수 정보 계산."
        // #swagger.tags = ["도장 홈"]
        // #swagger.summary = "도장용 월별 수련생 정보 계산(만지지 마시요)"
        try{
            const year = req.params.year
            const month = req.params.month

            let dojang_all_info = await models.Dojang.findAll({
                attributes:['id'],
                raw:true
            })
            for(let dojang_one_info of dojang_all_info){
                let dojang_info = await models.StudentInfo.findAll({
                    where: {dojang: dojang_one_info.id},
                    attributes:['id'],
                    raw:true
                })
                await models.DojangUser.create({
                    year, month, dojang: dojang_one_info.id, user: dojang_info.length
                })
            }
            res.send("seuccessfully created")
            
        }
        catch(err){
            await res.status(500).send({
                message:
                    err.message || "some error occured"
            })
        }
    },

    Dojang_Home_User_Year: async (req,res) => {
        // #swagger.description = "도장 홈 월별 수련생 수 정보."
        // #swagger.tags = ["도장 홈"]
        // #swagger.summary = " 월별 수련생 정보"
        try{
            const dojang_id = req.params.dojang_id
            console.log("11")
            const year = req.params.year
            const result_obj = new Object
            for(i=1;i<=12;i++){
                let monthly_dojang_user = await models.DojangUser.findOne({
                    where:{dojang : dojang_id, year : year, month: i},
                    raw:true
                })
                console.log(monthly_dojang_user,"monthly_dojang_user")
                if(monthly_dojang_user){
                    result_obj[`${i}월`] = monthly_dojang_user.user
                }
                else{
                    result_obj[`${i}월`] = 0
                }
            }
            return res.send(result_obj)
        }
        catch(err){
            await res.status(500).send({
                message:
                    err.message || "some error occured"
            })
        }
    },

    Dojang_Home_BillRate: async (req,res) => {
        // #swagger.description = "도장 홈 납부 정보."
        // #swagger.tags = ["도장 홈"]
        // #swagger.summary = "도장 홈 납부 정보"
        try{
            const dojang_id = req.params.dojang_id
            const year = req.params.year
            const month = req.params.month
            let paid_count = 0
            let non_paid_count = 0
            let result_obj = new Object
            
            let student_info = await models.StudentInfo.findAll({
                where:{dojang: dojang_id},
                attributes: ['id'],
                raw:true
            })
            for(let student_one of student_info){
                const student_bill = await models.StudentBill.findOne({
                    where: {paid_year: year, paid_month: month, student: student_one.id},
                    attributes: ['is_paid'],
                    raw:true
                })
                if(student_bill){
                    if(student_bill.is_paid == 1){
                        paid_count += 1
                    }
                    else{
                        non_paid_count+=1
                    }
                }
                else{
                    non_paid_count+=1
                }
            }
            result_obj['paid_count'] = paid_count
            result_obj['non_paid_count'] = non_paid_count

            res.send(result_obj)
        }
        catch(err){
            await res.status(500).send({
                message:
                    err.message || "some error occured"
            })
        }
    },

    Dojang_Home_ClassInfo: async (req,res) => {
        // #swagger.description = "도장 홈 반 정보."
        // #swagger.tags = ["도장 홈"]
        // #swagger.summary = " 도장 홈 반 정보"
        try{
            const dojang_id = req.params.dojang_id
            let today = new Date();
            today.setHours(today.getHours()+9);
            let yesterday = new Date(Date.parse(today) - 1 * 24*60*60*1000 );
            let result_arr = []
            
            let class_info = await models.Class.findAll({
                where: {dojang: dojang_id},
                attributes: ['id','title'],
                raw:true
            })
            i=0
            l=22
            for( let class_one of class_info ){
                let class_obj = new Object

                class_obj['title'] = class_one.title
                let student_info = await models.ClassStudent.findAll({
                    where: {class:class_one.id},
                    attributes: ['student'],
                    raw:true
                })
                let today_attendances_count = 0
                let today_non_attendances_count = student_info.length
                let yesterday_attendances_count = 0
                let yesterday_non_attendances_count = student_info.length

                // class_obj['student_count'] = student_info.length

                class_obj['student_count'] = 22

                let sabum_info = await models.SabumClass.findAll({
                    where: {class: class_one.id},
                    attributes: ['sabum'],
                    raw:true
                })
                class_obj['sabum_count'] = sabum_info.length
                
                for(let student_one of student_info){
                    //오늘 출석
                    let today_Att_query = `--sql
                        SELECT A.is_attended, A.id, date_format(A.createdAt,'%Y-%m-%d') as createdAt
                        FROM StudentInfos AS S 
                        RIGHT OUTER JOIN Attendances AS A
                        ON A.student=S.id 
                        WHERE S.id="${student_one.student}" AND YEAR(A.createdAt) = "${today.getFullYear()}" 
                        AND MONTH(A.createdAt) = "${today.getMonth()+1}" AND DAY(A.createdAt) = "${today.getDate()}"
                        `
                    today_Att_data = await sequelize.query(today_Att_query.slice(5,), 
                    {
                        type: Sequelize.QueryTypes.SELECT, 
                        raw: true   
                    });
                    if(today_Att_data[0]){
                        if(today_Att_data[0].is_attended == 1){
                            today_attendances_count += 1
                            today_non_attendances_count -= 1
                        }
                    }
                    //어제 출석
                    let yesterday_Att_query = `--sql
                        SELECT A.is_attended, A.id, date_format(A.createdAt,'%Y-%m-%d') as createdAt
                        FROM StudentInfos AS S 
                        RIGHT OUTER JOIN Attendances AS A
                        ON A.student=S.id 
                        WHERE S.id="${student_one.student}" AND YEAR(A.createdAt) = "${yesterday.getFullYear()}" 
                        AND MONTH(A.createdAt) = "${yesterday.getMonth()+1}" AND DAY(A.createdAt) = "${yesterday.getDate()}"
                        `
                    yesterday_Att_data = await sequelize.query(yesterday_Att_query.slice(5,), 
                    {
                        type: Sequelize.QueryTypes.SELECT, 
                        raw: true   
                    });
                    if(yesterday_Att_data[0]){
                        if(yesterday_Att_data[0].is_attended == 1){
                            yesterday_attendances_count += 1
                            yesterday_non_attendances_count -= 1
                        }
                    }
                }
                // class_obj['today_count'] = today_attendances_count
                // class_obj['today_absent_count'] = today_non_attendances_count
                // class_obj['yesterday_count'] = yesterday_attendances_count
                // class_obj['yesterday_absent_count'] = yesterday_non_attendances_count
                if(i>=2){
                    i = i-2,
                    l = l+2
                }
                class_obj['today_count'] = l
                class_obj['today_absent_count'] = i
                class_obj['yesterday_count'] = l - 1
                class_obj['yesterday_absent_count'] = i + 1
                i++
                l--
                result_arr.push(class_obj)
            }
            return res.send(result_arr)
        }
        catch(err){
            await res.status(500).send({
                message:
                    err.message || "some error occured"
            })
        }
    },

    Dojang_Home_Level: async (req,res) => {
        // #swagger.description = "도장 홈 수련생 level 정보."
        // #swagger.tags = ["도장 홈"]
        // #swagger.summary = " 도장 홈 수련생 level 정보"
        try{
            const dojang_id = req.params.dojang_id

            let result_obj = new Object
            let geub_1_level_count = 0
            let geub_2_level_count = 0
            let geub_3_level_count = 0
            let geub_4_level_count = 0
            let geub_5_level_count = 0
            let geub_6_level_count = 0
            let geub_7_level_count = 0
            let geub_8_level_count = 0
            let geub_9_level_count = 0
            let poom_1_level_count = 0
            let poom_2_level_count = 0
            let poom_3_level_count = 0
            let dan_1_level_count = 0
            let dan_2_level_count = 0
            let dan_3_level_count = 0

            let student_info = await models.StudentInfo.findAll({
                where: {dojang: dojang_id},
                attributes:[ 'level' ],
                raw:true
            })
            for(let student_one of student_info){
                if(student_one.level == "1급"){geub_1_level_count+=1}
                if(student_one.level == "2급"){geub_2_level_count+=1}
                if(student_one.level == "3급"){geub_3_level_count+=1}
                if(student_one.level == "4급"){geub_4_level_count+=1}
                if(student_one.level == "5급"){geub_5_level_count+=1}
                if(student_one.level == "6급"){geub_6_level_count+=1}
                if(student_one.level == "7급"){geub_7_level_count+=1}
                if(student_one.level == "8급"){geub_8_level_count+=1}
                if(student_one.level == "9급"){geub_9_level_count+=1}
                if(student_one.level == "1품"){poom_1_level_count+=1}
                if(student_one.level == "2품"){poom_2_level_count+=1}
                if(student_one.level == "3품"){poom_3_level_count+=1}
                if(student_one.level == "1단"){dan_1_level_count+=1}
                if(student_one.level == "2단"){dan_2_level_count+=1}
                if(student_one.level == "3단"){dan_3_level_count+=1}
            }
            result_obj["geub_9_level_count"] = geub_9_level_count
            result_obj["geub_8_level_count"] = geub_8_level_count
            result_obj["geub_7_level_count"] = geub_7_level_count
            result_obj["geub_6_level_count"] = geub_6_level_count
            result_obj["geub_5_level_count"] = geub_5_level_count
            result_obj["geub_4_level_count"] = geub_4_level_count
            result_obj["geub_3_level_count"] = geub_3_level_count
            result_obj["geub_2_level_count"] = geub_2_level_count
            result_obj["geub_1_level_count"] = geub_1_level_count
            result_obj["poom_1_level_count"] = poom_1_level_count
            result_obj["poom_2_level_count"] = poom_2_level_count
            result_obj["poom_3_level_count"] = poom_3_level_count
            result_obj["dan_1_level_count"] = dan_1_level_count
            result_obj["dan_2_level_count"] = dan_2_level_count
            result_obj["dan_3_level_count"] = dan_3_level_count
            return res.send(result_obj)
        }
        catch(err){
            await res.status(500).send({
                message:
                    err.message || "some error occured"
            })
        }
    },

    Dojang_Home_Schedule: async (req,res) => {
        // #swagger.description = "도장 홈화면 다가올 일정을 조회합니다."
        // #swagger.tags = ["도장 홈"]
        // #swagger.summary = "도장 홈화면 다가올 일정 조회"
        try{
            const dojang_id = req.params.dojang_id
            const today = new Date()

            let schedule_info = await models.Schedule.findAll({
                where: {dojang: dojang_id, 
                        start_date : {[Op.gt]: today} 
                    },
                    attributes: ['id', 'dojang', 'category', 'title', 'contents', 'start_date', 'end_date'],
                    raw:true,
                    order: [['start_date','asc']],
            })
            return res.send(schedule_info)
        }
        catch(err){
            await res.status(500).send({
                message:
                    err.message || "some error occured"
            })
        }
    },

    //초대 조회 
    InviteRead: async (req, res)=>{
        // #swagger.description = "초대 조회"
        // #swagger.tags = ["초대"]
        // #swagger.summary = "초대 조회"
        try{
            const dojang_id = req.params.dojang_id
            let result_arr = []
            let invite_info = await models.Invitation.findAll({
                where: {dojang: dojang_id},
                attributes: ['id','phone_number','student','recipient_type','expire_date','is_refused'],
                raw:true
            })
            for(let invite_one of invite_info){
                let invite_obj = new Object
                let level_info = new Object
                let student_info = new Object
                let user_info = await models.UserAccount.findOne({
                    where: {phone_number:invite_one.phone_number},
                    attributes: ['id','last_name','first_name','role']
                })
                
                if(invite_one.recipient_type == "USER" || invite_one.recipient_type == "FAMILY"){
                    student_info = await models.StudentInfo.findOne({
                        where: {id:invite_one.student},
                        attributes: ['level','dob','last_name','first_name','photo_url'],
                        raw:true
                    })
                    invite_obj['invite_info'] = invite_one
                    invite_obj['student_info'] = student_info
                    result_arr.push(invite_obj)
                }
                else if(invite_one.recipient_type == "KWANJANG"){
                    if(user_info){
                        if(user_info.role == 'KWANJANG'){
                            level_info = await models.KwanjangInfo.findOne({
                                where: {user:user_info.id},
                                attributes: ['level','photo_url'],
                                raw:true
                            })
                        }
                        invite_obj['invite_info'] = invite_one
                        invite_obj['user_info'] = user_info
                        invite_obj['level'] = level_info.level
                        invite_obj['photo_url'] = level_info.photo_url
                        result_arr.push(invite_obj)
                    }
                }
                else if(invite_one.recipient_type == "SABUM"){
                    if(user_info){
                        if(user_info.role == 'SABUM'){
                            level_info = await models.Sabum.findOne({
                                where: {user:user_info.id},
                                attributes: ['level','photo_url'],
                                raw:true
                            })
                        }
                        invite_obj['invite_info'] = invite_one
                        invite_obj['user_info'] = user_info
                        invite_obj['level'] = level_info.level
                        invite_obj['photo_url'] = level_info.photo_url
                        result_arr.push(invite_obj)
                    }
                }
            }
            return res.send(result_arr)
        }
        catch(err){
            await res.status(500).send({
                message:
                    err.message || "some error occured"
            })
        }
    },

    //급|띠
    LevelInfoCreate: async (req, res)=>{
        // #swagger.description = "급/띠 생성"
        // #swagger.tags = ["급/띠"]
        // #swagger.summary = "급/띠 생성"
        try{
            console.log("@@@")
            const dojang_id = req.params.dojang_id
            let FILES = req.files;
            let { level_info } = req.body
            const auth_role = req.role
            console.log(level_info,"level_info")
            console.log(FILES,"FILES")
            if(auth_role != "KWANJANG"){
                return res.send("you are not kwanjang")
            }

            if(FILES && level_info){
                level_info = JSON.parse(level_info)
                if(FILES.length != level_info.length){
                    return res.send("Number of datas and files are not equal")
                }
                for ( var i = 0; i < FILES.length; i++){
                    if(FILES[i].mimetype.split('/')[0]=="image"){
                        let imageName = generateFileName();
                        if(await models.UrlGroup.findOne({
                            where: {urls:"dojang/belt_img/"+imageName}
                        })){imageName = generateFileName();}
                        imageName = "dojang/belt_img/"+imageName
                        await models.UrlGroup.create({urls:imageName}) //url group에 늘리기
                        await uploadFile(FILES[i].buffer, imageName, FILES[i].mimetype)

                        if(level_info[i].level_name.charAt(level_info[i].level_name.length-1) == "급"){
                            await models.LevelInfo.create({
                                is_poom_dan : 0,
                                dojang_fk_id: dojang_id, dojang_fk_id_backup: dojang_id, level_name: level_info[i].level_name, 
                                belt_name: level_info[i].belt_name, belt_type: level_info[i].belt_type, 
                                first_line: level_info[i].first_line, second_line: level_info[i].second_line,
                                third_line: level_info[i].third_line, is_star: level_info[i].is_star, belt_img_url: imageName
                            })
                        }
                        else if(level_info[i].level_name.charAt(level_info[i].level_name.length-1) == "품"){
                            await models.LevelInfo.create({
                                is_poom_dan : 1,
                                dojang_fk_id: dojang_id, dojang_fk_id_backup: dojang_id, level_name: level_info[i].level_name, 
                                belt_name: level_info[i].belt_name, belt_type: level_info[i].belt_type, 
                                first_line: level_info[i].first_line, second_line: level_info[i].second_line,
                                third_line: level_info[i].third_line, is_star: level_info[i].is_star, belt_img_url: imageName
                            })
                        }
                        else if(level_info[i].level_name.charAt(level_info[i].level_name.length-1) == "단"){
                            await models.LevelInfo.create({
                                is_poom_dan : 1,
                                dojang_fk_id: dojang_id, dojang_fk_id_backup: dojang_id, level_name: level_info[i].level_name, 
                                belt_name: level_info[i].belt_name, belt_type: level_info[i].belt_type, 
                                first_line: level_info[i].first_line, second_line: level_info[i].second_line,
                                third_line: level_info[i].third_line, is_star: level_info[i].is_star, belt_img_url: imageName
                            })
                        }
                    }
                }
                return res.send("success")
            }
            else{
                return res.send("failed")
            }
        }
        catch(err){
            await res.status(500).send({
                message:
                    err.message || "some error occured"
            })
        }
    },

    LevelInfoRead: async (req, res)=>{
        // #swagger.description = "급/띠 조회"
        // #swagger.tags = ["급/띠"]
        // #swagger.summary = "급/띠 조회"
        try{
            const dojang_id = req.params.dojang_id
            let level_info = await models.LevelInfo.findAll({
                where: {dojang_fk_id: dojang_id, is_poom_dan: 0},
                raw: true
            })
            res.send(level_info)
        }
        catch(err){
            await res.status(500).send({
                message:
                    err.message || "some error occured"
            })
        }
    },

    LevelInfoReadBackup: async (req, res)=>{
        // #swagger.description = "급/띠 백업데이터 조회"
        // #swagger.tags = ["급/띠"]
        // #swagger.summary = "급/띠 백업데이터 조회"
        try{
            const dojang_id = req.params.dojang_id
            let level_info = await models.LevelInfo.findAll({
                where: {dojang_fk_id_backup: dojang_id},
                raw: true
            })
            res.send(level_info)
        }
        catch(err){
            await res.status(500).send({
                message:
                    err.message || "some error occured"
            })
        }
    },

    LevelInfoUpdate: async (req, res)=>{
        // #swagger.description = "급/띠 수정"
        // #swagger.tags = ["급/띠"]
        // #swagger.summary = "급/띠 수정"
        try{
            const dojang_id = req.params.dojang_id
            let FILES = req.files;
            let { level_info } = req.body
            const auth_role = req.role
            console.log(FILES,"FILES")
            console.log(level_info,"level_info")

            if(auth_role != "KWANJANG"){
                return res.send("you are not kwanjang")
            }

            if(FILES && level_info){
                level_info = JSON.parse(level_info)
                if(FILES.length != level_info.length){
                    return res.send("Number of datas and files are not equal")
                }
                await models.LevelInfo.update(
                    {
                        dojang_fk_id: null
                    },
                    {
                        where: {dojang_fk_id: dojang_id}
                    }
                )
                for ( var i = 0; i < FILES.length; i++){
                    if(FILES[i].mimetype.split('/')[0]=="image"){
                        let imageName = generateFileName();
                        if(await models.UrlGroup.findOne({
                            where: {urls:"dojang/belt_img/"+imageName}
                        })){imageName = generateFileName();}
                        imageName = "dojang/belt_img/"+imageName
                        await models.UrlGroup.create({urls:imageName}) //url group에 늘리기
                        await uploadFile(FILES[i].buffer, imageName, FILES[i].mimetype)

                        if(level_info[i].level_name.charAt(level_info[i].level_name.length-1) == "급"){
                            await models.LevelInfo.create({
                                is_poom_dan : 0,
                                dojang_fk_id: dojang_id, dojang_fk_id_backup: dojang_id, level_name: level_info[i].level_name, 
                                belt_name: level_info[i].belt_name, belt_type: level_info[i].belt_type, 
                                first_line: level_info[i].first_line, second_line: level_info[i].second_line,
                                third_line: level_info[i].third_line, is_star: level_info[i].is_star, belt_img_url: imageName
                            })
                        }
                        else if(level_info[i].level_name.charAt(level_info[i].level_name.length-1) == "품"){
                            await models.LevelInfo.create({
                                is_poom_dan : 1,
                                dojang_fk_id: dojang_id, dojang_fk_id_backup: dojang_id, level_name: level_info[i].level_name, 
                                belt_name: level_info[i].belt_name, belt_type: level_info[i].belt_type, 
                                first_line: level_info[i].first_line, second_line: level_info[i].second_line,
                                third_line: level_info[i].third_line, is_star: level_info[i].is_star, belt_img_url: imageName
                            })
                        }
                        else if(level_info[i].level_name.charAt(level_info[i].level_name.length-1) == "단"){
                            await models.LevelInfo.create({
                                is_poom_dan : 1,
                                dojang_fk_id: dojang_id, dojang_fk_id_backup: dojang_id, level_name: level_info[i].level_name, 
                                belt_name: level_info[i].belt_name, belt_type: level_info[i].belt_type, 
                                first_line: level_info[i].first_line, second_line: level_info[i].second_line,
                                third_line: level_info[i].third_line, is_star: level_info[i].is_star, belt_img_url: imageName
                            })
                        }

                        
                    }
                }
                return res.send("success")
            }
            else{
                return res.send("failed")
            }
        }
        catch(err){
            await res.status(500).send({
                message:
                    err.message || "some error occured"
            })
        }
    },

    LevelInfoDelete: async (req, res)=>{
        // #swagger.description = "급/띠 삭제"
        // #swagger.tags = ["급/띠"]
        // #swagger.summary = "급/띠 삭제"
        try{
            const dojang_id = req.params.dojang_id
            await models.LevelInfo.update(
                {
                    dojang_fk_id: null
                },
                {
                    where : {dojang_fk_id: dojang_id}
                }
            )
            res.send("success")
        }
        catch(err){
            await res.status(500).send({
                message:
                    err.message || "some error occured"
            })
        }
    },

    LevelInfoDeleteFull: async (req, res)=>{
        // #swagger.description = "급/띠 완전삭제"
        // #swagger.tags = ["급/띠"]
        // #swagger.summary = "급/띠 완전삭제"
        try{
            const dojang_id = req.params.dojang_id
            await models.LevelInfo.destroy(
                {
                    where : {dojang_fk_id_backup: dojang_id}
                }
            )
            res.send("success")
        }
        catch(err){
            await res.status(500).send({
                message:
                    err.message || "some error occured"
            })
        }
    },

    PID_Create: async (req, res)=>{
        // #swagger.description = "PID 번호 생성"
        // #swagger.tags = ["도장"]
        // #swagger.summary = "PID 번호 생성"
        try{
            const dojang_id = req.params.dojang_id
            const { PID } = req.body
            const auth_id = req.id
            const auth_role = req.role

            if(auth_role != "KWANJANG"){
                return res.send("You are not kwanjang")
            }
            let kwanjang_info = await models.KwanjangInfo.findOne({
                where: {user: auth_id},
                attributes: ['id'],
                raw:true
            })
            if(kwanjang_info){
                let kwanjangdojang_info = await models.KwanjangDojang.findOne({
                    where: {kwanjang: kwanjang_info.id, dojang: dojang_id},
                    raw:true
                })
                if(!kwanjangdojang_info){
                    return res.send("you are not kwanjang of inserted dojang")
                }
            }
            else{
                return res.send("kwanjang not exist")
            }
            await models.Dojang.update(
                {
                    PID
                },
                {
                    where: {id: dojang_id}
                }
            )
            res.send("successfully added")
        }
        catch(err){
            await res.status(500).send({
                message:
                    err.message || "some error occured"
            })
        }
    },

    PID_Read: async (req, res)=>{
        // #swagger.description = "PID 번호 조회"
        // #swagger.tags = ["도장"]
        // #swagger.summary = "PID 번호 조회"
        try{
            const dojang_id = req.params.dojang_id

            let dojang_info = await models.Dojang.findOne({
                where: {id: dojang_id},
                attributes: ['PID'],
                raw:true
            })
            res.send(dojang_info)
        }
        catch(err){
            await res.status(500).send({
                message:
                    err.message || "some error occured"
            })
        }
    },
}
