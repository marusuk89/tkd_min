const models = require("../models");
const bcrypt = require("bcrypt")
const authJwt = require('../util/authJWT');

const crypto = require("crypto");
const generateFileName = (bytes = 8) =>
    crypto.randomBytes(bytes).toString("hex");
const { uploadFile, getObjectSignedUrl, deleteFile } = require("../util/s3.js");

const jwt = require('jsonwebtoken');
const swaggerAutogen = require("swagger-autogen");
const { sequelize } = require('../models')
const Sequelize = require('sequelize');

module.exports = {
    //car
    CarRead: async (req,res,next) => {
        // #swagger.description = "차량 정보를 조회합니다. car_id 0이면 모두 조회 특정 id면 특정 차량 정보만 읽습니다"
        // #swagger.tags = ["차량"]
        // #swagger.summary = "차량 조회"
        /* #swagger.parameters['page'] = {
            in: "query",
            description: "페이지",
            type: "integer"
        }
        */
        let pageNum = req.query.page; // 요청 페이지 넘버
        let offset = 0;
        if(pageNum > 1){
            offset = 7 * (pageNum - 1);
        }
        dojang_id = req.params.dojang_id;
        car_id = req.params.car_id;
        try{
            if(car_id != 0){
                const data = await models.Car.findOne({
                    where: {
                        id: car_id,
                        dojang : dojang_id
                    },
                    attributes:{
                    include : [
                        [sequelize.fn('date_format', sequelize.col('createdAt'), '%Y-%m-%d'),'createdAt'],
                        [sequelize.fn('date_format', sequelize.col('updatedAt'), '%Y-%m-%d'),'updatedAt']
                    ],
                    }
                }) 
                res.send(data);
            }
            else if(car_id == 0){
                const data = await models.Car.findAndCountAll({
                    where: {
                        dojang : dojang_id
                    },
                    attributes:{
                        include : [
                            [sequelize.fn('date_format', sequelize.col('createdAt'), '%Y-%m-%d'),'createdAt'],
                            [sequelize.fn('date_format', sequelize.col('updatedAt'), '%Y-%m-%d'),'updatedAt']
                        ],
                        }
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

    CarCreate: async (req,res,next) => {
        // #swagger.description = "차량 정보를 만듭니다. body의 dojang칼럼은 dojang_id입니다 "
        // #swagger.tags = ["차량"]
        // #swagger.summary = "차량 생성"
        
        try{
            let FILE = req.files;
            let photo_url = []
            console.log(FILE,"FILE")
            if(FILE){
                for ( var i = 0; i < FILE.length; i++){
                    if(FILE[i].mimetype.split('/')[0]=="image"){
                        let imageName = generateFileName();
                        if(await models.UrlGroup.findOne({
                            where: {urls:"car/img/"+imageName}
                        })){imageName = generateFileName();}
                        imageName = "car/img/"+imageName
                        await models.UrlGroup.create({urls:imageName}) //url group에 늘리기
                        await uploadFile(FILE[i].buffer, imageName, FILE[i].mimetype)
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
            const is_driving = 0
            const {dojang, name, number, type, seater, memo} = req.body;
            await models.Car.create({ dojang, name, number, type, seater, 
                img_url:photo_url, memo, is_driving})
            res.send("Car Successfully created")
        }
        catch(err){
            await res.status(500).send({
                message:
                    err.message || "some error occured"
            })
        }
    },

    CarUpdate: async (req,res,next) => {
        /* #swagger.description = "차량 정보를 수정합니다. body의 dojang칼럼은 dojang_id입니다 
        "
        */
        // #swagger.tags = ["차량"]
        // #swagger.summary = "차량 수정"
        
        try{
            const dojang_id = req.params.dojang_id
            const car_id = req.params.car_id
            let { dojang, name, number, type, seater, memo, delImgname, } = req.body;
            console.log(delImgname,"delImgname")
            if (!await models.Car.findOne({
                where : {id : car_id}
            })){return res.send("car_id not exist")}

            if (!await models.Car.findOne({
                where : {id : car_id, dojang : dojang_id}
            })){return res.send("car is not in inserted dojang_id")}

            let FILE = req.files;
            let photo_url = []

            //기존 파일들 뽑아냄
            defaultPhoto = await models.Car.findOne({
                where: {id:car_id},
                attributes: ['img_url'],
                raw: true
            })

            

            //img
            //해당 키의 파일이 있을때만 실행
            if(FILE){
                //원래 파일이 있으면 지우고 원래 파일 가공
                if(defaultPhoto.img_url){
                    default_img = JSON.parse(defaultPhoto.img_url)
                    if(delImgname){
                        delImgname= JSON.parse(delImgname)
                        for(let del of delImgname){
                            for(let i=0; i< default_img.length; i++){
                                if(del == default_img[i]){
                                    console.log(default_img[i],"default_img[i]")
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
                    if(FILE[i].mimetype.split('/')[0]=="image"){
                        let imageName = generateFileName();
                        if(await models.UrlGroup.findOne({
                            where: {urls:"car/img/"+imageName}
                        })){imageName = generateFileName();}
                        imageName = "car/img/"+imageName
                        await models.UrlGroup.create({urls:imageName}) //url group에 늘리기
                        await uploadFile(FILE[i].buffer, imageName, FILE[i].mimetype)
                        photo_url.push(imageName)
                    }
                }
                //저장을 위한 문자화

                photo_url = JSON.stringify(photo_url)
                //따로 따로 업데이트
                if(photo_url.length == 2){
                    await models.Car.update(
                        {
                            img_url: null
                        },
                        {
                            where: { id: car_id}
                        }
                    )
                }
                else{
                    await models.Car.update(
                        {
                            img_url: photo_url
                        },
                        {
                            where: { id: car_id}
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
                    await models.Car.update(
                        {img_url : null},
                        {where: {id : car_id}}
                    )
                }
                else{
                    await models.Car.update(
                        {img_url:photo_url},
                        {where: {id : car_id}}
                    )
                }
            }
            //data
            await models.Car.update(
                {
                    dojang, name, number, type, seater, memo
                },
                {
                    where: { id: car_id}
                }
            ),
            res.send("Car successfully updated")
        }
        catch(err){
            await res.status(500).send({
                message:
                    err.message || "some error occured"
            })
        }
    },

    CarDelete: async (req,res) => {
        // #swagger.description = "차량을 지웁니다."
        // #swagger.tags = ["차량"]
        // #swagger.summary = "차량 삭제"
        const dojang_id = req.params.dojang_id
        const car_id = req.params.car_id;
        try{
            if (!await models.Car.findOne({
                where : {id : car_id}
            })){return res.send("car_id not exist")}

            if (!await models.Car.findOne({
                where : {id : car_id, dojang : dojang_id}
            })){return res.send("car is not in inserted dojang_id")}

            await models.Car.destroy(
                {
                    where : { id: car_id }
                }
            ) 
            res.send("Car successfully deleted")
        }   
        catch(err){
            res.status(500).send({
                message:
                    err.message || "some error occured"
            })
        }
    },

    //carOperation
    CarOperationRead: async (req,res,next) => {
        // #swagger.description = "차량운행 정보를 조회합니다."
        // #swagger.tags = ["차량"]
        // #swagger.summary = "차량운행 조회"
        
        try{
            const auth_role = req.role
            const auth_id = req.id
            const car_id = req.params.car_id;
            if(auth_role=="KWANJANG"){
                kwanjang_id = await models.KwanjangInfo.findOne({
                    where: {user:auth_id},
                    attributes: ['id'],
                    raw: true
                })
                dojang_id = await models.KwanjangDojang.findAll({
                    where: {kwanjang: kwanjang_id.id},
                    attributes: ['dojang'],
                    raw:true
                })

                is_Car_in_dojang = await models.Car.findOne({
                    where: {dojang: dojang_id[0].dojang},
                    attributes: ['id']
                })
            }
            if(!is_Car_in_dojang){
                return res.send("Car not in dojang")
            }
            let car_info = await models.Car.findOne({
                where: {id:car_id},
                raw:true
            })
            let carOperation_info = await models.CarOperation.findAll({
                where: {car: car_id},
                raw:true
            })
            car_info.carOperation_info = carOperation_info
            res.send(car_info)
        }
        catch(err){
            await res.status(500).send({
                message:
                    err.message || "some error occured"
            })
        }
    },

    //carOperation
    CarOperationReadByDojang: async (req,res,next) => {
        // #swagger.description = "차량운행 정보를 조회합니다."
        // #swagger.tags = ["차량"]
        // #swagger.summary = "차량운행 조회"
        
        try{
            const auth_role = req.role
            const auth_id = req.id
            // const dojang_id = req.params.dojang_id;
            if(auth_role=="KWANJANG"){
                kwanjang_id = await models.KwanjangInfo.findOne({
                    where: {user:auth_id},
                    attributes: ['id'],
                    raw: true
                })
                dojang_id = await models.KwanjangDojang.findAll({
                    where: {kwanjang: kwanjang_id.id},
                    attributes: ['dojang'],
                    raw:true
                })

                is_Car_in_dojang = await models.Car.findOne({
                    where: {dojang: dojang_id[0].dojang},
                    attributes: ['id']
                })
                if(!is_Car_in_dojang){
                    return res.send("Car not in dojang")
                }
            }
            let car_info = await models.Car.findAll({
                where: {dojang: dojang_id[0].dojang},
                raw:true
            })

            // let car_info = await models.Car.findOne({
            //     where: {id:car_id},
            //     raw:true
            // })
            for(let el of car_info){
                console.log(el,"el")
                let carOperation_info = await models.CarOperation.findAll({
                    where: {car: el.id},
                    raw:true
                    
                })
                el["carOperation_info"]=carOperation_info
            }
            
            res.send(car_info)
        }
        catch(err){
            await res.status(500).send({
                message:
                    err.message || "some error occured"
            })
        }
    },

    //carOperation
    CarOperationCreate: async (req,res,next) => {
        // #swagger.description = "차량운행 정보를 만듭니다."
        // #swagger.tags = ["차량"]
        // #swagger.summary = "차량운행 생성"
        
        try{
            const {car, car_latitude, car_longitude, driver} = req.body;
            // console.log(car,"car");
            console.log(req.body);
            await models.CarOperation.create({ car, car_latitude, car_longitude, driver })
            res.send("CarOperation Successfully created")
        }
        catch(err){
            await res.status(500).send({
                message:
                    err.message || "some error occured"
            })
        }
    },
    
    CarOperationUpdate: async (req,res,next) => {
        // #swagger.description = "차량정보를 업데이트 합니다."
        // #swagger.tags = ["차량"]
        // #swagger.summary = "차량운행 수정"
        
        try{
            const auth_role = req.role
            const auth_id = req.id
            const car_id = req.params.car_id;
            console.log(auth_role, "auth_role")
            if(auth_role=="KWANJANG"){
                kwanjang_id = await models.KwanjangInfo.findOne({
                    where: {user:auth_id},
                    attributes: ['id'],
                    raw: true
                })
                dojang_id = await models.KwanjangDojang.findAll({
                    where: {kwanjang: kwanjang_id.id},
                    attributes: ['dojang'],
                    raw:true
                })

                is_Car_in_dojang = await models.Car.findOne({
                    where: {dojang: dojang_id[0].dojang},
                    attributes: ['id']
                })
            }
            driving_info =await models.CarOperation.findOne({
                where: {id: car_id},
                attributes: ['is_driving']
            })
            
            if(!driving_info.is_driving){
                return res.send("Not driving")
            }
            if(!is_Car_in_dojang){
                return res.send("Car not in dojang")
            }
            await models.CarOperation.update(
                {
                    ...req.body
                },
                {
                    where: { id: car_id }
                }
            ),
            res.send("CarOperations successfully updated")
        }
        catch(err){
            await res.status(500).send({
                message:
                    err.message || "some error occured"
            })
        }
    },
}
