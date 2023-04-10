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
// const {AS_cal_UserCount} = require("../controller/")

const { AS_cal_UserCount } = require("../controller/utilController.js");

const jwt = require('jsonwebtoken');
const { TableHints } = require("sequelize");
const swaggerAutogen = require("swagger-autogen");
const db = require("../models");
const note = require("../models/note");
const secret = "Hello";

const region_infos = [
    {"서울" : ["강남구", "강동구", "강북구", "강서구", "관악구", "광진구", "구로구", "금천구", "노원구", "도봉구", "동대문구", "동작구", "마포구", "서대문구", "서초구", "성동구", "성북구", "송파구", "양천구", "영등포구", "용산구", "은평구", "종로구", "중구", "중랑구"]},
    {"경기" : ["가평군", "고양시", "과천시", "광명시", "광주시", "구리시", "군포시", "김포시", "남양주시", "동두천시", "부천시", "성남시", "수원시", "시흥시", "안산시", "안성시", "안양시", "양주시", "양평군", "여주시", "연천군", "오산시", "용인시", "의왕시", "의정부시", "이천시", "파주시", "평택시", "포천시", "하남시", "화성시"]},
    {"인천" : ["강화군", "계양구", "남동구", "동구", "미추홀구", "부평구", "서구", "연수구", "옹진군", "중구"]},
    {"대전" : ["대덕구", "동구", "서구", "유성구", "중구"]},
    {"대구" : ["남구", "달서구", "달성군", "동구", "북구", "서구", "수성구", "중구"]},
    {"광주" : ["광산구", "남구", "동구", "북구", "서구"]},
    {"부산" : ["강서구", "금정구", "기장군", "남구", "동구", "동래구", "부산진구", "북구", "사상구", "사하구", "서구", "수영구", "연제구", "영도구", "중구", "해운대구"]},
    {"울산" : ["남구", "동구", "북구", "울주군", "중구"]},
    {"세종" : ["세종특별자치시"]},
    {"경남" : ["거제시", "거창군", "고성군", "김해시", "남해군", "밀양시", "사천시", "산청군", "양산시", "의령군", "진주시", "창녕군", "창원시", "통영시", "하동군", "함안군", "함양군", "합천군"]},
    {"경북" : ["경산시", "경주시", "고령군", "구미시", "군위군", "김천시", "문경시", "봉화군", "상주시", "성주군", "안동시", "영덕군", "영양군", "영주시", "영천시", "예천군", "울릉군", "울진군", "의성군", "청도군", "청송군", "칠곡군", "포항시"]},
    {"전남" : ["강진군", "고흥군", "곡성군", "광양시", "구례군", "나주시", "담양군", "목포시", "무안군", "보성군", "순천시", "신안군", "여수시", "영광군", "영암군", "완도군", "장성군", "장흥군", "진도군", "함평군", "해남군", "화순군"]},
    {"전북" : ["고창군", "군산시", "김제시", "남원시", "무주군", "부안군", "순창군", "완주군", "익산시", "임실군", "장수군", "전주시", "정읍시", "진안군"]},
    {"충남" : ["계룡시", "공주시", "금산군", "논산시", "당진시", "보령시", "부여군", "서산시", "서천군", "아산시", "예산군", "천안시", "청양군", "태안군", "홍성군"]},
    {"충북" : ["괴산군", "단양군", "보은군", "영동군", "옥천군", "음성군", "제천시", "증평군", "진천군", "청주시", "충주시"]},
    {"제주" : ["서귀포시", "제주시"]}
]

module.exports = {
    
    //associ
    AssociCreate: async (req,res,next) => {
        // #swagger.description = "협회 정보를 만듭니다. body의 dojang칼럼은 dojang_id입니다 "
        // #swagger.tags = ["협회"]
        // #swagger.summary = "협회 생성"
        try{
            let FILE = req.file;
            let photo_url = []
            const { name, user, country_code, address_name, road_address, region_1depth_name, region_2depth_name,
                region_3depth_name, region_3depth_h_name, address_detail, rep_number
            } = req.body;
            
            if(FILE){
                if(FILE.mimetype.split('/')[0]=="image"){
                    let imageName = generateFileName();
                    if(await models.UrlGroup.findOne({
                        where: {urls:"associ/logo/"+imageName}
                    })){imageName = generateFileName();}
                    imageName = "associ/logo/"+imageName
                    await models.UrlGroup.create({urls:imageName}) //url group에 늘리기
                    await uploadFile(FILE.buffer, imageName, FILE.mimetype)
                    photo_url.push(imageName)
                }
            }
            photo_url = JSON.stringify(photo_url).slice(2,-2)
            
            await models.AssociationInfos.create({ 
                name, user, country_code, address_name, road_address, region_1depth_name, region_2depth_name,
                region_3depth_name, region_3depth_h_name, address_detail, rep_number, 
                logo_img : photo_url})
            res.send("Association Successfully created")
        }
        catch(err){
            await res.status(500).send({
                message:
                    err.message || "some error occured"
            })
        }
    },

    AssociRead: async (req,res,next) => {
        // #swagger.description = "협회 정보를 조회합니다. car_id 0이면 모두 조회 특정 id면 특정 협회 정보만 읽습니다"
        // #swagger.tags = ["협회"]
        // #swagger.summary = "협회 조회"
        /* #swagger.parameters['page'] = {
            in: "query",
            description: "페이지",
            type: "integer"
        }
        */
        try{
            let pageNum = req.query.page; // 요청 페이지 넘버
            let offset = 0;
            if(pageNum > 1){
                offset = 7 * (pageNum - 1);
            }
            associ_id = req.params.associ_id;
            if(associ_id != 0){
                const data = await models.AssociationInfos.findOne({
                    where: {
                        id: associ_id,
                    },
                    attributes:{
                    include : [
                        [sequelize.fn('date_format', sequelize.col('createdAt'), '%Y-%m-%d'),'createdAt'],
                        [sequelize.fn('date_format', sequelize.col('updatedAt'), '%Y-%m-%d'),'updatedAt']
                    ],
                    }
                }) 
                if(!data){res.send("associ_id not exist in database")}
                res.send(data);
            }
            else if(associ_id == 0){
                const data = await models.AssociationInfos.findAndCountAll({
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

    AssociUpdate: async (req,res,next) => {
        /* #swagger.description = "협회 정보를 수정합니다. body의 dojang칼럼은 dojang_id입니다 
        "
        */
        // #swagger.tags = ["협회"]
        // #swagger.summary = "협회 수정"
        try{
            associ_id = req.params.associ_id;
            let { name, user, country_code, address_name, road_address, region_1depth_name, region_2depth_name,
                region_3depth_name, region_3depth_h_name, address_detail, rep_number } = req.body;

            if (!await models.AssociationInfos.findOne({
                where : {id : associ_id}
            })){return res.send("associ_id not exist")}

            let FILE = req.file;
            let photo_url = []

            //기존 파일들 뽑아냄
            defaultPhoto = await models.AssociationInfos.findOne({
                where: {id:associ_id},
                attributes: ['logo_img'],
                raw: true
            })

            //img
            //해당 키의 파일이 있을때만 실행
            console.log("photo_url")
            if(FILE){
                //원래 파일이 있으면 지우고 원래 파일 가공
                if(defaultPhoto.logo_img){
                    default_img = JSON.parse(defaultPhoto.logo_img)
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
                if(FILE.mimetype.split('/')[0]=="image"){
                    let imageName = generateFileName();
                    if(await models.UrlGroup.findOne({
                        where: {urls:"associ/logo/"+imageName}
                    })){imageName = generateFileName();}
                    imageName = "associ/logo/"+imageName
                    await models.UrlGroup.create({urls:imageName}) //url group에 늘리기
                    await uploadFile(FILE.buffer, imageName, FILE.mimetype)
                    photo_url.push(imageName)
                }
                //저장을 위한 문자화
                photo_url = JSON.stringify(photo_url)
                //따로 따로 업데이트
                await models.AssociationInfos.update(
                    {
                        logo_img: photo_url
                    },
                    {
                        where: { id: associ_id}
                    }
                )
            }
            
            //data
            await models.AssociationInfos.update(
                {
                    name, user, country_code, address_name, road_address, region_1depth_name, region_2depth_name,
                    region_3depth_name, region_3depth_h_name, address_detail, rep_number
                },
                {
                    where: { id: associ_id}
                }
            ),
            res.send("Associ successfully updated")
        }
        catch(err){
            await res.status(500).send({
                message:
                    err.message || "some error occured"
            })
        }
    },

    AssociDelete: async (req,res) => {
        // #swagger.description = "협회를 지웁니다."
        // #swagger.tags = ["협회"]
        // #swagger.summary = "협회 삭제"
        try{
            const associ_id = req.params.associ_id;
            let associ_info = await models.AssociationInfos.findOne({
                where: {id: associ_id}
            })
            if(!associ_info){return res.send("data not exist")}
            await models.AssociationInfos.destroy({
                where: {id: associ_id}
            })
            res.send("AssociationInfos successfully deleted")
        }   
        catch(err){
            res.status(500).send({
                message:
                    err.message || "some error occured"
            })
        }
    },

    //country
    CountryCreate: async (req,res,next) => {
        // #swagger.description = "나라 정보를 만듭니다."
        // #swagger.tags = ["나라"]
        // #swagger.summary = "나라 생성"
        try{
            // let FILE = req.file;
            // let photo_url = []
            // const { name, user, country_code, address_name, road_address, region_1depth_name, region_2depth_name,
            //     region_3depth_name, region_3depth_h_name, address_detail, rep_number
            // } = req.body;
            
            // if(FILE){
            //     if(FILE.mimetype.split('/')[0]=="image"){
            //         let imageName = generateFileName();
            //         if(await models.UrlGroup.findOne({
            //             where: {urls:"country/flag/"+imageName}
            //         })){imageName = generateFileName();}
            //         imageName = "country/flag/"+imageName
            //         await models.UrlGroup.create({urls:imageName}) //url group에 늘리기
            //         await uploadFile(FILE.buffer, "country/flag/"+imageName, FILE.mimetype)
            //         photo_url.push(imageName)
            //     }
            // }
            // photo_url = JSON.stringify(photo_url).slice(2,-2)
            
            // await models.AssociationInfos.create({ 
            //     name, user, country_code, address_name, road_address, region_1depth_name, region_2depth_name,
            //     region_3depth_name, region_3depth_h_name, address_detail, rep_number, 
            //     logo_img : photo_url})
            // res.send("Association Successfully created")
        }
        catch(err){
            await res.status(500).send({
                message:
                    err.message || "some error occured"
            })
        }
    },

    CountryRead: async (req,res,next) => {
        // #swagger.description = "나라 정보를 조회합니다. associ_id 0이면 모두 조회 특정 id면 특정 협회 정보만 읽습니다"
        // #swagger.tags = ["나라"]
        // #swagger.summary = "나라 조회"
        /* #swagger.parameters['page'] = {
            in: "query",
            description: "페이지",
            type: "integer"
        }
        */
        try{
            // let pageNum = req.query.page; // 요청 페이지 넘버
            // let offset = 0;
            // if(pageNum > 1){
            //     offset = 7 * (pageNum - 1);
            // }
            // associ_id = req.params.associ_id;
            // if(associ_id != 0){
            //     const data = await models.AssociationInfos.findOne({
            //         where: {
            //             id: associ_id,
            //         },
            //         attributes:{
            //         include : [
            //             [sequelize.fn('date_format', sequelize.col('createdAt'), '%Y-%m-%d'),'createdAt'],
            //             [sequelize.fn('date_format', sequelize.col('updatedAt'), '%Y-%m-%d'),'updatedAt']
            //         ],
            //         }
            //     }) 
            //     if(!data){res.send("associ_id not exist in database")}
            //     res.send(data);
            // }
            // else if(associ_id == 0){
            //     const data = await models.AssociationInfos.findAndCountAll({
            //         attributes:{
            //             include : [
            //                 [sequelize.fn('date_format', sequelize.col('createdAt'), '%Y-%m-%d'),'createdAt'],
            //                 [sequelize.fn('date_format', sequelize.col('updatedAt'), '%Y-%m-%d'),'updatedAt']
            //             ],
            //             }
            //     }) 
            //     res.send(data);
            // }
        }
        catch(err){
            await res.status(500).send({
                message:
                    err.message || "some error occured"
            })
        }
    },

    CountryUpdate: async (req,res,next) => {
        /* #swagger.description = "나라 정보를 수정합니다.  
        "
        */
        // #swagger.tags = ["나라"]
        // #swagger.summary = "나라 수정"
        try{
            // associ_id = req.params.associ_id;
            // let { name, user, country_code, address_name, road_address, region_1depth_name, region_2depth_name,
            //     region_3depth_name, region_3depth_h_name, address_detail, rep_number } = req.body;

            // if (!await models.AssociationInfos.findOne({
            //     where : {id : associ_id}
            // })){return res.send("associ_id not exist")}

            // let FILE = req.file;
            // let photo_url = []

            // //기존 파일들 뽑아냄
            // defaultPhoto = await models.AssociationInfos.findOne({
            //     where: {id:associ_id},
            //     attributes: ['logo_img'],
            //     raw: true
            // })

            // //img
            // //해당 키의 파일이 있을때만 실행
            // console.log("photo_url")
            // if(FILE){
            //     //원래 파일이 있으면 지우고 원래 파일 가공
            //     if(defaultPhoto.logo_img){
            //         default_img = JSON.parse(defaultPhoto.logo_img)
            //         if(delImgname){
            //             delImgname= JSON.parse(delImgname)
            //             for(let del of delImgname){
            //                 for(let i=0; i< default_img.length; i++){
            //                     if(del == default_img[i]){
            //                         await deleteFile("associ/logo/"+default_img[i]),
            //                         await models.UrlGroup.destroy({ //url group에서 삭제하기
            //                             where: {urls: default_img[i]}
            //                         })
            //                         default_img.splice(i, 1); 
            //                         i--; 
            //                     }
            //                 }
            //             }
            //         }
            //         photo_url = default_img
            //     }
            //     //원래 파일이 없다면 빈 배열 부여
            //     if(!photo_url){
            //         photo_url = []
            //     }
                
            //     //받은 파일이 있으니 파일 생성
            //     if(FILE.mimetype.split('/')[0]=="image"){
            //         let imageName = generateFileName();
            //         if(await models.UrlGroup.findOne({
            //             where: {urls:"country/flag/"+imageName}
            //         })){imageName = generateFileName();}
            //         imageName = "country/flag/"+imageName
            //         await models.UrlGroup.create({urls:imageName}) //url group에 늘리기
            //         await uploadFile(FILE.buffer, "country/flag/"+imageName, FILE.mimetype)
            //         photo_url.push(imageName)
            //     }
            //     //저장을 위한 문자화
            //     photo_url = JSON.stringify(photo_url)
            //     //따로 따로 업데이트
            //     await models.AssociationInfos.update(
            //         {
            //             logo_img: photo_url
            //         },
            //         {
            //             where: { id: associ_id}
            //         }
            //     )
            // }
            
            // //data
            // await models.AssociationInfos.update(
            //     {
            //         name, user, country_code, address_name, road_address, region_1depth_name, region_2depth_name,
            //         region_3depth_name, region_3depth_h_name, address_detail, rep_number
            //     },
            //     {
            //         where: { id: associ_id}
            //     }
            // ),
            // res.send("Associ successfully updated")
        }
        catch(err){
            await res.status(500).send({
                message:
                    err.message || "some error occured"
            })
        }
    },

    CountryDelete: async (req,res) => {
        // #swagger.description = "나라를 지웁니다."
        // #swagger.tags = ["나라"]
        // #swagger.summary = "나라 삭제"
        try{
            // const associ_id = req.params.associ_id;
            // let associ_info = await models.AssociationInfos.findOne({
            //     where: {id: associ_id}
            // })
            // if(!associ_info){return res.send("data not exist")}
            // await models.AssociationInfos.destroy({
            //     where: {id: associ_id}
            // })
            // res.send("AssociationInfos successfully deleted")
        }   
        catch(err){
            res.status(500).send({
                message:
                    err.message || "some error occured"
            })
        }
    },

    AssociLoginRead: async (req,res) => {
        /* #swagger.description = "협회 아이디로 로그인된 데이터를 조회합니다. <br /> 
        */
        // #swagger.tags = ["협회"]
        // #swagger.summary = "협회 관련 정보 조회"
        try{
            const auth_id = req.id
            let result_arr = []
            let associ_info = await models.AssociationInfos.findOne({
                where: {user:auth_id},
                raw:true
            })
            
            for(let region_1depth of region_infos){
                let depth_1 = Object.keys(region_1depth)[0]
                let depth_2 = Object.values(region_1depth)[0]
                // route1 - 한국 협회
                if(associ_info.name == "한국"){
                    result_arr.push(depth_1)
                }
                // route2 - 지역 협회
                if(associ_info.name == depth_1){
                    associ_info['region_info'] = depth_2
                    return res.send(associ_info)
                }
            }
            // route1 - 한국 협회
            associ_info['region_info'] = result_arr
            res.send(associ_info)
        }   
        catch(err){
            res.status(500).send({
                message:
                    err.message || "some error occured"
            })
        }
    },

    AS_Cal_UserCount_Year: async (req,res) => {
        /* #swagger.description = "회원추이 데이터를 테이블에 저장합니다. <br /> 
        전체 조회 시 depth_1에 -1"
        */
        // #swagger.tags = ["통계"]
        // #swagger.summary = "통계 연간 수련생 세팅(만들면 안됩니다)"
        try{
            const year = req.params.year
            const month = req.params.month
            for(let region_1depth of region_infos){
                console.log(Object.keys(region_1depth)[0],"Object.keys(region_1depth)")
                let student_count = 0
                //해당되는 지역만 조회
                let dojang_all_info = await models.Dojang.findAll({
                    where: {
                        region_1depth_name: {[Op.like]: '%' + Object.keys(region_1depth)[0] + '%'},
                    },
                    attributes:['id','address_name','road_address','address_detail','region_1depth_name','region_2depth_name','region_3depth_name'],
                    raw: true
                })
                console.log(dojang_all_info,"dojang_all_info")
                for(let dojang of dojang_all_info){
                    let student_info = await models.StudentInfo.findAll({
                        where: {dojang: dojang.id},
                        attributes: ['id'],
                        raw:true
                    })
                    console.log(student_info,"student_info")
                    student_count += student_info.length
                }
                console.log(student_count,"student_count")
                await models.AS_UserCount_Year.create({
                    year, month, student_count, depth_1: Object.keys(region_1depth)[0]
                })
            }
            
            res.send("222")
        }   
        catch(err){
            res.status(500).send({
                message:
                    err.message || "some error occured"
            })
        }
    },

    AS_UserCount_Year: async (req,res) => {
        /* #swagger.description = "회원추이 데이터를 불러옵니다. <br /> 
        전체 조회 시 depth_1에 -1"
        */
        // #swagger.tags = ["협회 통계"]
        // #swagger.summary = "통계 연간 수련생 수"
        try{
            const year = req.params.year
            const depth_1 = req.params.depth_1
            const auth_id = req.id

            // //협회 로그인 정보 조회
            // let login_info = await models.AssociationInfos.findOne({
            //     where: {user:auth_id},
            //     attributes: ['name'],
            //     raw:true
            // })
            // //협회 로그인 정보가 있을시
            // if(login_info){
            //     //한국협회로 로그인 한게 아니라면
            //     if(login_info.name != "한국"){
            //         //call한 params값과 로그인 정보가 다를 경우
            //         if(login_info.name != depth_1){
            //             return res.send("You are not authorized")
            //         }
            //     }
            //     //한국협회로 로그인
            //     else if(login_info.name == "한국"){
            //         if(depth_1 != -1){
            //             return res.send("You are super. you are not low depth")
            //         }
            //     }
            // }
            // //협회 ID가 아닌 경우
            // else{
            //     return res.send("You are not association user")
            // }


            if(depth_1 == -1){
                let result_arr = []
                for(i=1;i<=12;i++){
                    let month_arr = []
                    let month_obj = new Object
                    let stu_count = 0
                    let depth_1_info = await models.AS_UserCount_Year.findAll({
                        where: {year: year, month: i},
                        attributes: ['depth_1','student_count','year','month'],
                        raw: true,
                    })
                    for(let depth_1_name of depth_1_info){
                        stu_count += depth_1_name.student_count
                    }
                    
                    console.log(depth_1_info,"depth_1_info")
                    month_arr.push(stu_count)
                    month_obj[`${i}월`] = month_arr[0]
                    result_arr.push(month_obj)
                    
                }
                return res.send(result_arr)
            }
            else{
                let result_arr = []
                for(i=1;i<=12;i++){
                    let month_arr = []
                    let month_obj = new Object
                    let stu_count = 0
                    let depth_1_info = await models.AS_UserCount_Year.findOne({
                        where: {year: year, month: i, depth_1: depth_1},
                        attributes: ['depth_1','student_count','year','month'],
                        raw: true,
                    })
                    console.log(depth_1_info,"depth_1_info")
                    if(depth_1_info){
                        stu_count += depth_1_info.student_count
                    }
                    month_arr.push(stu_count)
                    month_obj[`${i}월`] = month_arr[0]
                    result_arr.push(month_obj)
                    
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

    AS_Cal_UserCount: async (req,res) => {
        /* #swagger.description = "시도별 데이터를 테이블에 저장합니다. <br /> 
        전체 조회 시 depth_1에 -1"
        */
        // #swagger.tags = ["통계"]
        // #swagger.summary = "통계 시도별 수련생 세팅(만들면 안됩니다)"
        try{
            const year = req.params.year
            const month = req.params.month
            for(let region_1depth of region_infos){
                // console.log(Object.keys(region_1depth)[0],"Object.keys(region_1depth)")
                // console.log(Object.values(region_1depth),"Object.values(region_1depth)")
                for(let region_2depth of Object.values(region_1depth)[0]){
                    console.log(region_2depth,"region_2depth")
                    // console.log(region_2depth,"region_2depth")
                    let student_count = 0
                    let dojang_all_info = await models.Dojang.findAll({
                        where: {
                            region_1depth_name: {[Op.like]: '%' + Object.keys(region_1depth)[0] + '%'},
                            region_2depth_name: {[Op.like]: '%' + region_2depth + '%'}
                        },
                        attributes:['id','address_name','road_address','address_detail','region_1depth_name','region_2depth_name','region_3depth_name'],
                        raw: true
                    })
                    for(let dojang of dojang_all_info){
                        let student_info = await models.StudentInfo.findAll({
                            where: {dojang: dojang.id},
                            attributes: ['id'],
                            raw:true
                        })
                        student_count += student_info.length
                    }
                    console.log(student_count,"student_count")
                    await models.AS_UserCount.create({
                        year, month, student_count, depth_1: Object.keys(region_1depth)[0], depth_2: region_2depth
                    })
                }
            }
            
            res.send("222")
        }   
        catch(err){
            res.status(500).send({
                message:
                    err.message || "some error occured"
            })
        }
    },

    AS_UserCount: async (req,res) => {
        /* #swagger.description = "시도별 데이터를 불러옵니다. <br /> 
        전체 조회 시 depth_1에 -1"
        */
        // #swagger.tags = ["협회 통계"]
        // #swagger.summary = "통계 시도별 수련생 수"
        try{
            const year = req.params.year
            const month = req.params.month
            const depth_1 = req.params.depth_1
            const auth_id = req.id

            // //협회 로그인 정보 조회
            // let login_info = await models.AssociationInfos.findOne({
            //     where: {user:auth_id},
            //     attributes: ['name'],
            //     raw:true
            // })
            // //협회 로그인 정보가 있을시
            // if(login_info){
            //     //한국협회로 로그인 한게 아니라면
            //     if(login_info.name != "한국"){
            //         //call한 params값과 로그인 정보가 다를 경우
            //         if(login_info.name != depth_1){
            //             return res.send("You are not authorized")
            //         }
            //     }
            //     //한국협회로 로그인
            //     else if(login_info.name == "한국"){
            //         if(depth_1 != -1){
            //             return res.send("You are super. you are not low depth")
            //         }
            //     }
            // }
            // //협회 ID가 아닌 경우
            // else{
            //     return res.send("You are not association user")
            // }

            if(depth_1 == -1){
                let result_arr = []
                //모든 시/도 정보를 불러옵니다
                let depth_1_info = await models.AS_UserCount.findAll({
                    where: {year: year, month: month},
                    attributes: ['depth_1','year','month'],
                    raw: true,
                    group: 'AS_UserCount.depth_1'
                })
                console.log(depth_1_info,"depth_1_info")
                for(let depth_1_name of depth_1_info)
                {
                    let stu_count = 0
                    console.log(depth_1_name,"depth_1_name")
                    let depth_1_result = await models.AS_UserCount.findAll({
                        where: {depth_1: depth_1_name.depth_1,year: year, month: month},
                        attributes: ['student_count','depth_2'],
                        raw: true
                    })
                    console.log(depth_1_result,"depth_1_result")
                    for(let depth_1_student_cnt of depth_1_result){
                        stu_count += depth_1_student_cnt.student_count
                    }
                    //depth_1_name -> depth_2_name 이름 변경
                    depth_1_name.depth_2 = depth_1_name.depth_1
                    delete depth_1_name.depth_1

                    depth_1_name['stu_count'] = stu_count
                    result_arr.push(depth_1_name)
                }
                return res.send(result_arr)
            }
            else{
                let result_arr = []
                //모든 시/도 정보를 불러옵니다
                let depth_1_info = await models.AS_UserCount.findAll({
                    where: {year: year, month: month, depth_1: depth_1},
                    attributes: ['depth_1','depth_2','year','month'],
                    raw: true,
                })
                for(let depth_1_name of depth_1_info)
                {
                    let stu_count = 0
                    console.log(depth_1_name,"depth_1_name")
                    let depth_1_result = await models.AS_UserCount.findOne({
                        where: {depth_1: depth_1_name.depth_1, depth_2: depth_1_name.depth_2},
                        attributes: ['student_count'],
                        raw: true
                    })
                    console.log(depth_1_result,"depth_1_result")
                    stu_count += depth_1_result.student_count
                    depth_1_name['stu_count'] = stu_count
                    result_arr.push(depth_1_name)
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

    AS_Cal_DojangCount: async (req,res) => {
        /* #swagger.description = "시도별 도장 데이터를 테이블에 저장합니다. <br /> 
        */
        // #swagger.tags = ["통계"]
        // #swagger.summary = "통계 시도별 도장 세팅(만들면 안됩니다)"
        try{
            const year = req.params.year
            const month = req.params.month
            for(let region_1depth of region_infos){
                // console.log(Object.keys(region_1depth)[0],"Object.keys(region_1depth)")
                // console.log(Object.values(region_1depth),"Object.values(region_1depth)")
                for(let region_2depth of Object.values(region_1depth)[0]){
                    // console.log(region_2depth,"region_2depth")
                    let dojang_count = 0
                    let dojang_all_info = await models.Dojang.findAll({
                        where: {
                            region_1depth_name: {[Op.like]: '%' + Object.keys(region_1depth)[0] + '%'},
                            region_2depth_name: {[Op.like]: '%' + region_2depth + '%'}
                        },
                        attributes:['id','address_name','road_address','address_detail','region_1depth_name','region_2depth_name','region_3depth_name'],
                        raw: true
                    })
                    dojang_count += dojang_all_info.length
                    console.log(dojang_count,"dojang_count")
                    await models.AS_DojangCount.create({
                        year, month, dojang_count, depth_1: Object.keys(region_1depth)[0], depth_2: region_2depth
                    })
                }
            }
            
            res.send("successfully created")
        }   
        catch(err){
            res.status(500).send({
                message:
                    err.message || "some error occured"
            })
        }
    },

    AS_DojangCount: async (req,res) => {
        /* #swagger.description = "시도별 도장 데이터를 불러옵니다. <br /> 
        전체 조회 시 depth_1에 -1"
        */
        // #swagger.tags = ["협회 통계"]
        // #swagger.summary = "통계 시도별 도장 수"
        try{
            const year = req.params.year
            const month = req.params.month
            const depth_1 = req.params.depth_1
            const auth_id = req.id

            // //협회 로그인 정보 조회
            // let login_info = await models.AssociationInfos.findOne({
            //     where: {user:auth_id},
            //     attributes: ['name'],
            //     raw:true
            // })
            // //협회 로그인 정보가 있을시
            // if(login_info){
            //     //한국협회로 로그인 한게 아니라면
            //     if(login_info.name != "한국"){
            //         //call한 params값과 로그인 정보가 다를 경우
            //         if(login_info.name != depth_1){
            //             return res.send("You are not authorized")
            //         }
            //     }
            //     //한국협회로 로그인
            //     else if(login_info.name == "한국"){
            //         if(depth_1 != -1){
            //             return res.send("You are super. you are not low depth")
            //         }
            //     }
            // }
            // //협회 ID가 아닌 경우
            // else{
            //     return res.send("You are not association user")
            // }

            if(depth_1 == -1){
                let result_arr = []
                //모든 시/도 정보를 불러옵니다
                let depth_1_info = await models.AS_DojangCount.findAll({
                    where: {year: year, month: month},
                    attributes: ['depth_1','year','month'],
                    raw: true,
                    group: 'AS_DojangCount.depth_1'
                })
                console.log(depth_1_info,"depth_1_info")
                for(let depth_1_name of depth_1_info)
                {
                    let dojang_count = 0
                    console.log(depth_1_name,"depth_1_name")
                    let depth_1_result = await models.AS_DojangCount.findAll({
                        where: {year: year, month: month, depth_1: depth_1_name.depth_1},
                        attributes: ['dojang_count','depth_2'],
                        raw: true
                    })
                    console.log(depth_1_result,"depth_1_result")
                    for(let depth_1_dojang_cnt of depth_1_result){
                        dojang_count += depth_1_dojang_cnt.dojang_count
                    }
                    //depth_1_name -> depth_2_name 이름 변경
                    depth_1_name.depth_2 = depth_1_name.depth_1
                    delete depth_1_name.depth_1

                    depth_1_name['dojang_count'] = dojang_count
                    result_arr.push(depth_1_name)
                }
                return res.send(result_arr)
            }
            else{
                let result_arr = []
                //모든 시/도 정보를 불러옵니다
                let depth_1_info = await models.AS_DojangCount.findAll({
                    where: {year: year, month: month, depth_1: depth_1},
                    attributes: ['depth_1','depth_2','year','month','dojang_count'],
                    raw: true,
                })
                console.log(depth_1_info,"depth_1_info")
                for(let depth_1_name of depth_1_info)
                {
                    let dojang_count = 0
                    let depth_1_result = await models.AS_DojangCount.findOne({
                        where: {year: year, month: month, depth_1: depth_1_name.depth_1, depth_2: depth_1_name.depth_2},
                        attributes: ['dojang_count'],
                        raw: true
                    })
                    console.log(depth_1_result.dojang_count,"depth_1_result.dojang_count")
                    dojang_count += depth_1_result.dojang_count
                    depth_1_name['dojang_count'] = dojang_count
                    result_arr.push(depth_1_name)
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

    AS_Cal_Sex: async (req,res) => {
        /* #swagger.description = "성별 데이터를 테이블에 저장합니다. <br /> 
        전체 조회 시 depth_1에 -1"
        */
        // #swagger.tags = ["통계"]
        // #swagger.summary = "통계 성별 세팅(만들면 안됩니다)"
        try{
            const year = req.params.year
            const month = req.params.month
            for(let region_1depth of region_infos){
                console.log(Object.keys(region_1depth)[0],"Object.keys(region_1depth)")
                let male_count = 0
                let female_count = 0
                //해당되는 지역만 조회
                let dojang_all_info = await models.Dojang.findAll({
                    where: {
                        region_1depth_name: {[Op.like]: '%' + Object.keys(region_1depth)[0] + '%'},
                    },
                    attributes:['id','address_name','road_address','address_detail','region_1depth_name','region_2depth_name','region_3depth_name'],
                    raw: true
                })
                console.log(dojang_all_info,"dojang_all_info")
                for(let dojang of dojang_all_info){
                    let student_info = await models.StudentInfo.findAll({
                        where: {dojang: dojang.id},
                        attributes: ['id','sex'],
                        raw:true
                    })
                    console.log(student_info,"student_info")
                    for(let student_one of student_info){
                        if(student_one.sex == 1){
                            male_count += 1
                        }
                        if(student_one.sex == 2){
                            female_count += 1
                        }
                    }
                }
                await models.AS_Sex.create({
                    year, month, female_count, male_count, depth_1: Object.keys(region_1depth)[0]
                })
            }
            res.send("successfully created")
        }   
        catch(err){
            res.status(500).send({
                message:
                    err.message || "some error occured"
            })
        }
    },

    AS_Sex: async (req,res) => {
        /* #swagger.description = "성별 데이터를 불러옵니다. <br /> 
        전체 조회 시 depth_1에 -1"
        */
        // #swagger.tags = ["협회 통계"]
        // #swagger.summary = "통계 성별 수"
        try{
            const year = req.params.year
            const month = req.params.month
            const depth_1 = req.params.depth_1
            const auth_id = req.id

            // //협회 로그인 정보 조회
            // let login_info = await models.AssociationInfos.findOne({
            //     where: {user:auth_id},
            //     attributes: ['name'],
            //     raw:true
            // })
            // //협회 로그인 정보가 있을시
            // if(login_info){
            //     //한국협회로 로그인 한게 아니라면
            //     if(login_info.name != "한국"){
            //         //call한 params값과 로그인 정보가 다를 경우
            //         if(login_info.name != depth_1){
            //             return res.send("You are not authorized")
            //         }
            //     }
            //     //한국협회로 로그인
            //     else if(login_info.name == "한국"){
            //         if(depth_1 != -1){
            //             return res.send("You are super. you are not low depth")
            //         }
            //     }
            // }
            // //협회 ID가 아닌 경우
            // else{
            //     return res.send("You are not association user")
            // }

            if(depth_1 == -1){
                let result_obj = new Object
                let male_count = 0
                let female_count = 0
                let depth_1_info = await models.AS_Sex.findAll({
                    where: {year: year, month: month},
                    attributes: ['depth_1','male_count','female_count','year','month'],
                    raw: true,
                })
                for(let depth_1_name of depth_1_info){
                    female_count += depth_1_name.female_count
                    male_count += depth_1_name.male_count
                }
                
                result_obj["year"] = year
                result_obj["month"] = month
                result_obj["female_count"] = female_count
                result_obj["male_count"] = male_count
                    
                return res.send(result_obj)
            }
            else{
                let result_obj = new Object
                let male_count = 0
                let female_count = 0
                let depth_1_info = await models.AS_Sex.findOne({
                    where: {year: year, month: month, depth_1: depth_1},
                    attributes: ['depth_1','male_count','female_count','year','month'],
                    raw: true,
                })
                console.log(depth_1_info,"depth_1_info")
                if(depth_1_info){
                    female_count += depth_1_info.female_count
                    male_count += depth_1_info.male_count
                }
                result_obj["year"] = year
                result_obj["month"] = month
                result_obj["female_count"] = female_count
                result_obj["male_count"] = male_count
                    
                return res.send(result_obj)
            }
        }   
        catch(err){
            res.status(500).send({
                message:
                    err.message || "some error occured"
            })
        }
    },

    AS_Cal_Age: async (req,res) => {
        /* #swagger.description = "연령별 데이터를 테이블에 저장합니다. <br /> 
        */
        // #swagger.tags = ["통계"]
        // #swagger.summary = "통계 연령별 세팅(만들면 안됩니다)"
        try{
            const year = req.params.year
            const month = req.params.month
            let today = new(Date)
            let today_year = today.getFullYear()

            for(let region_1depth of region_infos){
                console.log(Object.keys(region_1depth)[0],"Object.keys(region_1depth)")
                let preschool_count = 0
                let elementary_count = 0
                let middle_count = 0
                let high_count = 0
                let adult_count = 0
                //해당되는 지역만 조회
                let dojang_all_info = await models.Dojang.findAll({
                    where: {
                        region_1depth_name: {[Op.like]: '%' + Object.keys(region_1depth)[0] + '%'},
                    },
                    attributes:['id','address_name','road_address','address_detail','region_1depth_name','region_2depth_name','region_3depth_name'],
                    raw: true
                })
                console.log(dojang_all_info,"dojang_all_info")
                for(let dojang of dojang_all_info){
                    let student_info = await models.StudentInfo.findAll({
                        where: {dojang: dojang.id},
                        attributes: ['id','dob'],
                        raw:true
                    })
                    console.log(student_info,"student_info")
                    for(let student_one of student_info){
                        if(student_one.dob){
                            student_one.dob = student_one.dob.split('-')[0]
                            let age = today_year - student_one.dob + 1
                            if(age <= 7){
                                preschool_count += 1
                            }
                            else if( age >= 8 && age <= 13 ){
                                elementary_count += 1
                            }
                            else if( age >= 14 && age <= 16 ){
                                middle_count += 1
                            }
                            else if( age >= 17 && age <= 19 ){
                                high_count += 1
                            }
                            else{
                                adult_count += 1
                            }
                        }
                    }
                }
                await models.AS_Age.create({
                    year, month, preschool_count, elementary_count, middle_count, 
                    high_count, adult_count, depth_1: Object.keys(region_1depth)[0]
                })
            }
            res.send("successfully created")
        }   
        catch(err){
            res.status(500).send({
                message:
                    err.message || "some error occured"
            })
        }
    },

    AS_Age: async (req,res) => {
        /* #swagger.description = "성별 데이터를 불러옵니다. <br /> 
        전체 조회 시 depth_1에 -1"
        */
        // #swagger.tags = ["협회 통계"]
        // #swagger.summary = "통계 성별 수"
        try{
            const year = req.params.year
            const month = req.params.month
            const depth_1 = req.params.depth_1
            const auth_id = req.id

            // //협회 로그인 정보 조회
            // let login_info = await models.AssociationInfos.findOne({
            //     where: {user:auth_id},
            //     attributes: ['name'],
            //     raw:true
            // })
            // //협회 로그인 정보가 있을시
            // if(login_info){
            //     //한국협회로 로그인 한게 아니라면
            //     if(login_info.name != "한국"){
            //         //call한 params값과 로그인 정보가 다를 경우
            //         if(login_info.name != depth_1){
            //             return res.send("You are not authorized")
            //         }
            //     }
            //     //한국협회로 로그인
            //     else if(login_info.name == "한국"){
            //         if(depth_1 != -1){
            //             return res.send("You are super. you are not low depth")
            //         }
            //     }
            // }
            // //협회 ID가 아닌 경우
            // else{
            //     return res.send("You are not association user")
            // }

            if(depth_1 == -1){
                let result_obj = new Object
                let preschool_count = 0
                let elementary_count = 0
                let middle_count = 0
                let high_count = 0
                let adult_count = 0
                let depth_1_info = await models.AS_Age.findAll({
                    where: {year: year, month: month},
                    attributes: ['depth_1','preschool_count','elementary_count',
                    'middle_count','high_count','adult_count','year','month'],
                    raw: true,
                })
                for(let depth_1_name of depth_1_info){
                    preschool_count += depth_1_name.preschool_count
                    elementary_count += depth_1_name.elementary_count
                    middle_count += depth_1_name.middle_count
                    high_count += depth_1_name.high_count
                    adult_count += depth_1_name.adult_count
                }
                
                result_obj["year"] = year
                result_obj["month"] = month
                result_obj["preschool_count"] = preschool_count
                result_obj["elementary_count"] = elementary_count
                result_obj["middle_count"] = middle_count
                result_obj["high_count"] = high_count
                result_obj["adult_count"] = adult_count
                    
                return res.send(result_obj)
            }
            else{
                let result_obj = new Object
                let preschool_count = 0
                let elementary_count = 0
                let middle_count = 0
                let high_count = 0
                let adult_count = 0
                let depth_1_info = await models.AS_Age.findOne({
                    where: {year: year, month: month, depth_1: depth_1},
                    attributes: ['depth_1','preschool_count','elementary_count',
                    'middle_count','high_count','adult_count','year','month'],
                    raw: true,
                })
                console.log(depth_1_info,"depth_1_info")
                if(depth_1_info){
                    preschool_count += depth_1_info.preschool_count
                    elementary_count += depth_1_info.elementary_count
                    middle_count += depth_1_info.middle_count
                    high_count += depth_1_info.high_count
                    adult_count += depth_1_info.adult_count
                }
                result_obj["year"] = year
                result_obj["month"] = month
                result_obj["preschool_count"] = preschool_count
                result_obj["elementary_count"] = elementary_count
                result_obj["middle_count"] = middle_count
                result_obj["high_count"] = high_count
                result_obj["adult_count"] = adult_count
                    
                return res.send(result_obj)
            }
        }   
        catch(err){
            res.status(500).send({
                message:
                    err.message || "some error occured"
            })
        }
    },

    AS_Cal_Geub: async (req,res) => {
        /* #swagger.description = "급별 데이터를 테이블에 저장합니다. <br /> 
        전체 조회 시 depth_1에 -1"
        */
        // #swagger.tags = ["통계"]
        // #swagger.summary = "통계 급별 세팅(만들면 안됩니다)"
        try{
            const year = req.params.year
            const month = req.params.month
            for(let region_1depth of region_infos){
                console.log(Object.keys(region_1depth)[0],"Object.keys(region_1depth)")
                let geub_1_count = 0
                let geub_2_count = 0
                let geub_3_count = 0
                let geub_4_count = 0
                let geub_5_count = 0
                let geub_6_count = 0
                let geub_7_count = 0
                let geub_8_count = 0
                let geub_9_count = 0
                //해당되는 지역만 조회
                let dojang_all_info = await models.Dojang.findAll({
                    where: {
                        region_1depth_name: {[Op.like]: '%' + Object.keys(region_1depth)[0] + '%'},
                    },
                    attributes:['id','address_name','road_address','address_detail','region_1depth_name','region_2depth_name','region_3depth_name'],
                    raw: true
                })
                console.log(dojang_all_info,"dojang_all_info")
                for(let dojang of dojang_all_info){
                    let student_info = await models.StudentInfo.findAll({
                        where: {dojang: dojang.id},
                        attributes: ['id','level'],
                        raw:true
                    })
                    let level_info = await models.LevelInfo.findAll({
                        where: {dojang_fk_id: dojang.id},
                        raw:true
                    })
                    let max_level = level_info.length
                    console.log(student_info,"student_info")
                    for(let student_one of student_info){
                        if(student_one.level.charAt(student_one.level.length-1) == "급"){
                            student_geub = student_one.level.split('급')[0]
                            student_geub = JSON.parse(student_geub)
                            // max_level에 맞춰서 조정 해야함
                            // 촉촉한 초코칩
                            console.log(student_geub,"student_geub")
                            if(student_geub == 1){geub_1_count += 1}
                            if(student_geub == 2){geub_2_count += 1}
                            if(student_geub == 3){geub_3_count += 1}
                            if(student_geub == 4){geub_4_count += 1}
                            if(student_geub == 5){geub_5_count += 1}
                            if(student_geub == 6){geub_6_count += 1}
                            if(student_geub == 7){geub_7_count += 1}
                            if(student_geub == 8){geub_8_count += 1}
                            if(student_geub == 9){geub_9_count += 1}
                        }
                    }
                }
                console.log(geub_1_count,"geub_1_count")
                console.log(geub_2_count,"geub_2_count")
                console.log(geub_3_count,"geub_3_count")
                console.log(geub_4_count,"geub_4_count")
                console.log(geub_5_count,"geub_5_count")
                console.log(geub_6_count,"geub_6_count")
                console.log(geub_7_count,"geub_7_count")
                console.log(geub_8_count,"geub_8_count")
                console.log(geub_9_count,"geub_9_count")
                // await models.AS_Geub.create({
                //     year, month, depth_1: Object.keys(region_1depth)[0], 
                //     geub_1_count, geub_2_count, geub_3_count,
                //     geub_4_count, geub_5_count, geub_6_count,
                //     geub_7_count, geub_8_count, geub_9_count
                // })
            }
            res.send("successfully created")
        }   
        catch(err){
            res.status(500).send({
                message:
                    err.message || "some error occured"
            })
        }
    },

    AS_Geub: async (req,res) => {
        /* #swagger.description = "급별 데이터를 불러옵니다. <br /> 
        전체 조회 시 depth_1에 -1"
        */
        // #swagger.tags = ["협회 통계"]
        // #swagger.summary = "통계 급별 수"
        try{
            const year = req.params.year
            const month = req.params.month
            const depth_1 = req.params.depth_1
            const auth_id = req.id

            // //협회 로그인 정보 조회
            // let login_info = await models.AssociationInfos.findOne({
            //     where: {user:auth_id},
            //     attributes: ['name'],
            //     raw:true
            // })
            // //협회 로그인 정보가 있을시
            // if(login_info){
            //     //한국협회로 로그인 한게 아니라면
            //     if(login_info.name != "한국"){
            //         //call한 params값과 로그인 정보가 다를 경우
            //         if(login_info.name != depth_1){
            //             return res.send("You are not authorized")
            //         }
            //     }
            //     //한국협회로 로그인
            //     else if(login_info.name == "한국"){
            //         if(depth_1 != -1){
            //             return res.send("You are super. you are not low depth")
            //         }
            //     }
            // }
            // //협회 ID가 아닌 경우
            // else{
            //     return res.send("You are not association user")
            // }

            if(depth_1 == -1){
                let result_obj = new Object
                let geub_1_count = 0
                let geub_2_count = 0
                let geub_3_count = 0
                let geub_4_count = 0
                let geub_5_count = 0
                let geub_6_count = 0
                let geub_7_count = 0
                let geub_8_count = 0
                let geub_9_count = 0
                let depth_1_info = await models.AS_Geub.findAll({
                    where: {year: year, month: month},
                    attributes: ['depth_1','year','month',
                    'geub_1_count', 'geub_2_count', 'geub_3_count',
                    'geub_4_count', 'geub_5_count', 'geub_6_count',
                    'geub_7_count', 'geub_8_count', 'geub_9_count'],
                    raw: true,
                })
                for(let depth_1_name of depth_1_info){
                    geub_1_count += depth_1_name.geub_1_count
                    geub_2_count += depth_1_name.geub_2_count
                    geub_3_count += depth_1_name.geub_3_count
                    geub_4_count += depth_1_name.geub_4_count
                    geub_5_count += depth_1_name.geub_5_count
                    geub_6_count += depth_1_name.geub_6_count
                    geub_7_count += depth_1_name.geub_7_count
                    geub_8_count += depth_1_name.geub_8_count
                    geub_9_count += depth_1_name.geub_9_count
                }
                
                result_obj["year"] = year
                result_obj["month"] = month
                result_obj["geub_1_count"] = geub_1_count
                result_obj["geub_2_count"] = geub_2_count
                result_obj["geub_3_count"] = geub_3_count
                result_obj["geub_4_count"] = geub_4_count
                result_obj["geub_5_count"] = geub_5_count
                result_obj["geub_6_count"] = geub_6_count
                result_obj["geub_7_count"] = geub_7_count
                result_obj["geub_8_count"] = geub_8_count
                result_obj["geub_9_count"] = geub_9_count
                    
                return res.send(result_obj)
            }
            else{
                let result_obj = new Object
                let geub_1_count = 0
                let geub_2_count = 0
                let geub_3_count = 0
                let geub_4_count = 0
                let geub_5_count = 0
                let geub_6_count = 0
                let geub_7_count = 0
                let geub_8_count = 0
                let geub_9_count = 0
                let depth_1_info = await models.AS_Geub.findOne({
                    where: {year: year, month: month, depth_1: depth_1},
                    attributes: ['depth_1','year','month',
                    'geub_1_count', 'geub_2_count', 'geub_3_count',
                    'geub_4_count', 'geub_5_count', 'geub_6_count',
                    'geub_7_count', 'geub_8_count', 'geub_9_count'],
                    raw: true,
                })
                console.log(depth_1_info,"depth_1_info")
                if(depth_1_info){
                    geub_1_count += depth_1_info.geub_1_count
                    geub_2_count += depth_1_info.geub_2_count
                    geub_3_count += depth_1_info.geub_3_count
                    geub_4_count += depth_1_info.geub_4_count
                    geub_5_count += depth_1_info.geub_5_count
                    geub_6_count += depth_1_info.geub_6_count
                    geub_7_count += depth_1_info.geub_7_count
                    geub_8_count += depth_1_info.geub_8_count
                    geub_9_count += depth_1_info.geub_9_count
                }
                result_obj["year"] = year
                result_obj["month"] = month
                result_obj["geub_1_count"] = geub_1_count
                result_obj["geub_2_count"] = geub_2_count
                result_obj["geub_3_count"] = geub_3_count
                result_obj["geub_4_count"] = geub_4_count
                result_obj["geub_5_count"] = geub_5_count
                result_obj["geub_6_count"] = geub_6_count
                result_obj["geub_7_count"] = geub_7_count
                result_obj["geub_8_count"] = geub_8_count
                result_obj["geub_9_count"] = geub_9_count
                    
                return res.send(result_obj)
            }
        }   
        catch(err){
            res.status(500).send({
                message:
                    err.message || "some error occured"
            })
        }
    },

    AS_Cal_Geub_levelup: async (req,res) => {
        /* #swagger.description = "급별 데이터를 테이블에 저장합니다. <br /> 
        전체 조회 시 depth_1에 -1"
        */
        // #swagger.tags = ["통계"]
        // #swagger.summary = "통계 급별 세팅(만들면 안됩니다)"
        try{
            const year = req.params.year
            const month = req.params.month
            for(let region_1depth of region_infos){
                console.log(Object.keys(region_1depth)[0],"Object.keys(region_1depth)")
                let geub_1_levelup_count = 0
                let geub_2_levelup_count = 0
                let geub_3_levelup_count = 0
                let geub_4_levelup_count = 0
                let geub_5_levelup_count = 0
                let geub_6_levelup_count = 0
                let geub_7_levelup_count = 0
                let geub_8_levelup_count = 0
                let geub_9_levelup_count = 0
                //해당되는 지역만 조회
                let dojang_all_info = await models.Dojang.findAll({
                    where: {
                        region_1depth_name: {[Op.like]: '%' + Object.keys(region_1depth)[0] + '%'},
                    },
                    attributes:['id','address_name','road_address','address_detail','region_1depth_name','region_2depth_name','region_3depth_name'],
                    raw: true
                })
                console.log(dojang_all_info,"dojang_all_info")
                for(let dojang of dojang_all_info){
                    let levelup_info = await models.LevelUpInfo.findAll({
                        where: {dojang: dojang.id},
                        attributes: ['id','level_after'],
                        raw:true
                    })
                    console.log(levelup_info,"levelup_info")
                    for(let levelup_one of levelup_info){
                        if(levelup_one.level_after == "1급"){
                            geub_1_levelup_count += 1
                        }
                        if(levelup_one.level_after == "2급"){
                            geub_2_levelup_count += 1
                        }
                        if(levelup_one.level_after == "3급"){
                            geub_3_levelup_count += 1
                        }
                        if(levelup_one.level_after == "4급"){
                            geub_4_levelup_count += 1
                        }
                        if(levelup_one.level_after == "5급"){
                            geub_5_levelup_count += 1
                        }
                        if(levelup_one.level_after == "6급"){
                            geub_6_levelup_count += 1
                        }
                        if(levelup_one.level_after == "7급"){
                            geub_7_levelup_count += 1
                        }
                        if(levelup_one.level_after == "8급"){
                            geub_8_levelup_count += 1
                        }
                        if(levelup_one.level_after == "9급"){
                            geub_9_levelup_count += 1
                        }
                    }
                }
                await models.AS_Geub_levelup.create({
                    year, month, depth_1: Object.keys(region_1depth)[0], 
                    geub_1_levelup_count, geub_2_levelup_count, geub_3_levelup_count,
                    geub_4_levelup_count, geub_5_levelup_count, geub_6_levelup_count,
                    geub_7_levelup_count, geub_8_levelup_count, geub_9_levelup_count
                })
            }
            res.send("successfully created")
        }   
        catch(err){
            res.status(500).send({
                message:
                    err.message || "some error occured"
            })
        }
    },

    AS_Geub_levelup: async (req,res) => {
        /* #swagger.description = "급별 데이터를 불러옵니다. <br /> 
        전체 조회 시 depth_1에 -1"
        */
        // #swagger.tags = ["협회 통계"]
        // #swagger.summary = "통계 급별 수"
        try{
            const year = req.params.year
            const month = req.params.month
            const depth_1 = req.params.depth_1
            const auth_id = req.id

            // //협회 로그인 정보 조회
            // let login_info = await models.AssociationInfos.findOne({
            //     where: {user:auth_id},
            //     attributes: ['name'],
            //     raw:true
            // })
            // //협회 로그인 정보가 있을시
            // if(login_info){
            //     //한국협회로 로그인 한게 아니라면
            //     if(login_info.name != "한국"){
            //         //call한 params값과 로그인 정보가 다를 경우
            //         if(login_info.name != depth_1){
            //             return res.send("You are not authorized")
            //         }
            //     }
            //     //한국협회로 로그인
            //     else if(login_info.name == "한국"){
            //         if(depth_1 != -1){
            //             return res.send("You are super. you are not low depth")
            //         }
            //     }
            // }
            // //협회 ID가 아닌 경우
            // else{
            //     return res.send("You are not association user")
            // }

            if(depth_1 == -1){
                let result_obj = new Object
                let geub_1_levelup_count = 0
                let geub_2_levelup_count = 0
                let geub_3_levelup_count = 0
                let geub_4_levelup_count = 0
                let geub_5_levelup_count = 0
                let geub_6_levelup_count = 0
                let geub_7_levelup_count = 0
                let geub_8_levelup_count = 0
                let geub_9_levelup_count = 0
                let depth_1_info = await models.AS_Geub_levelup.findAll({
                    where: {year: year, month: month},
                    attributes: ['depth_1','year','month',
                    'geub_1_levelup_count', 'geub_2_levelup_count', 'geub_3_levelup_count',
                    'geub_4_levelup_count', 'geub_5_levelup_count', 'geub_6_levelup_count',
                    'geub_7_levelup_count', 'geub_8_levelup_count', 'geub_9_levelup_count'],
                    raw: true,
                })
                for(let depth_1_name of depth_1_info){
                    geub_1_levelup_count += depth_1_name.geub_1_levelup_count
                    geub_2_levelup_count += depth_1_name.geub_2_levelup_count
                    geub_3_levelup_count += depth_1_name.geub_3_levelup_count
                    geub_4_levelup_count += depth_1_name.geub_4_levelup_count
                    geub_5_levelup_count += depth_1_name.geub_5_levelup_count
                    geub_6_levelup_count += depth_1_name.geub_6_levelup_count
                    geub_7_levelup_count += depth_1_name.geub_7_levelup_count
                    geub_8_levelup_count += depth_1_name.geub_8_levelup_count
                    geub_9_levelup_count += depth_1_name.geub_9_levelup_count
                }
                
                result_obj["year"] = year
                result_obj["month"] = month
                result_obj["geub_1_levelup_count"] = geub_1_levelup_count
                result_obj["geub_2_levelup_count"] = geub_2_levelup_count
                result_obj["geub_3_levelup_count"] = geub_3_levelup_count
                result_obj["geub_4_levelup_count"] = geub_4_levelup_count
                result_obj["geub_5_levelup_count"] = geub_5_levelup_count
                result_obj["geub_6_levelup_count"] = geub_6_levelup_count
                result_obj["geub_7_levelup_count"] = geub_7_levelup_count
                result_obj["geub_8_levelup_count"] = geub_8_levelup_count
                result_obj["geub_9_levelup_count"] = geub_9_levelup_count
                    
                return res.send(result_obj)
            }
            else{
                let result_obj = new Object
                let geub_1_levelup_count = 0
                let geub_2_levelup_count = 0
                let geub_3_levelup_count = 0
                let geub_4_levelup_count = 0
                let geub_5_levelup_count = 0
                let geub_6_levelup_count = 0
                let geub_7_levelup_count = 0
                let geub_8_levelup_count = 0
                let geub_9_levelup_count = 0
                let depth_1_info = await models.AS_Geub_levelup.findOne({
                    where: {year: year, month: month, depth_1: depth_1},
                    attributes: ['depth_1','year','month',
                    'geub_1_levelup_count', 'geub_2_levelup_count', 'geub_3_levelup_count',
                    'geub_4_levelup_count', 'geub_5_levelup_count', 'geub_6_levelup_count',
                    'geub_7_levelup_count', 'geub_8_levelup_count', 'geub_9_levelup_count'],
                    raw: true,
                })
                console.log(depth_1_info,"depth_1_info")
                if(depth_1_info){
                    geub_1_levelup_count += depth_1_info.geub_1_levelup_count
                    geub_2_levelup_count += depth_1_info.geub_2_levelup_count
                    geub_3_levelup_count += depth_1_info.geub_3_levelup_count
                    geub_4_levelup_count += depth_1_info.geub_4_levelup_count
                    geub_5_levelup_count += depth_1_info.geub_5_levelup_count
                    geub_6_levelup_count += depth_1_info.geub_6_levelup_count
                    geub_7_levelup_count += depth_1_info.geub_7_levelup_count
                    geub_8_levelup_count += depth_1_info.geub_8_levelup_count
                    geub_9_levelup_count += depth_1_info.geub_9_levelup_count
                }
                result_obj["year"] = year
                result_obj["month"] = month
                result_obj["geub_1_levelup_count"] = geub_1_levelup_count
                result_obj["geub_2_levelup_count"] = geub_2_levelup_count
                result_obj["geub_3_levelup_count"] = geub_3_levelup_count
                result_obj["geub_4_levelup_count"] = geub_4_levelup_count
                result_obj["geub_5_levelup_count"] = geub_5_levelup_count
                result_obj["geub_6_levelup_count"] = geub_6_levelup_count
                result_obj["geub_7_levelup_count"] = geub_7_levelup_count
                result_obj["geub_8_levelup_count"] = geub_8_levelup_count
                result_obj["geub_9_levelup_count"] = geub_9_levelup_count
                    
                return res.send(result_obj)
            }
        }   
        catch(err){
            res.status(500).send({
                message:
                    err.message || "some error occured"
            })
        }
    },

    AS_Cal_Poom: async (req,res) => {
        /* #swagger.description = "품별 데이터를 테이블에 저장합니다. <br /> 
        전체 조회 시 depth_1에 -1"
        */
        // #swagger.tags = ["통계"]
        // #swagger.summary = "통계 품별 세팅(만들면 안됩니다)"
        try{
            const year = req.params.year
            const month = req.params.month
            for(let region_1depth of region_infos){
                console.log(Object.keys(region_1depth)[0],"Object.keys(region_1depth)")
                let poom_1_count = 0
                let poom_2_count = 0
                let poom_3_count = 0
                let dan_1_count = 0
                let dan_2_count = 0
                let dan_3_count = 0
                //해당되는 지역만 조회
                let dojang_all_info = await models.Dojang.findAll({
                    where: {
                        region_1depth_name: {[Op.like]: '%' + Object.keys(region_1depth)[0] + '%'},
                    },
                    attributes:['id','address_name','road_address','address_detail','region_1depth_name','region_2depth_name','region_3depth_name'],
                    raw: true
                })
                console.log(dojang_all_info,"dojang_all_info")
                for(let dojang of dojang_all_info){
                    let student_info = await models.StudentInfo.findAll({
                        where: {dojang: dojang.id},
                        attributes: ['id','level'],
                        raw:true
                    })
                    console.log(student_info,"student_info")
                    for(let student_one of student_info){
                        if(student_one.level == "1품"){
                            poom_1_count += 1
                        }
                        if(student_one.level == "2품"){
                            poom_2_count += 1
                        }
                        if(student_one.level == "3품"){
                            poom_3_count += 1
                        }
                        if(student_one.level == "1단"){
                            dan_1_count += 1
                        }
                        if(student_one.level == "2단"){
                            dan_2_count += 1
                        }
                        if(student_one.level == "3단"){
                            dan_3_count += 1
                        }
                    }
                }
                await models.AS_Poom.create({
                    year, month, depth_1: Object.keys(region_1depth)[0], 
                    poom_1_count, poom_2_count, poom_3_count, dan_1_count, dan_2_count, dan_3_count
                })
            }
            res.send("successfully created")
        }   
        catch(err){
            res.status(500).send({
                message:
                    err.message || "some error occured"
            })
        }
    },

    AS_Poom: async (req,res) => {
        /* #swagger.description = "품별 데이터를 불러옵니다. <br /> 
        전체 조회 시 depth_1에 -1"
        */
        // #swagger.tags = ["협회 통계"]
        // #swagger.summary = "통계 품별 수"
        try{
            const year = req.params.year
            const month = req.params.month
            const depth_1 = req.params.depth_1
            const auth_id = req.id

            // //협회 로그인 정보 조회
            // let login_info = await models.AssociationInfos.findOne({
            //     where: {user:auth_id},
            //     attributes: ['name'],
            //     raw:true
            // })
            // //협회 로그인 정보가 있을시
            // if(login_info){
            //     //한국협회로 로그인 한게 아니라면
            //     if(login_info.name != "한국"){
            //         //call한 params값과 로그인 정보가 다를 경우
            //         if(login_info.name != depth_1){
            //             return res.send("You are not authorized")
            //         }
            //     }
            //     //한국협회로 로그인
            //     else if(login_info.name == "한국"){
            //         if(depth_1 != -1){
            //             return res.send("You are super. you are not low depth")
            //         }
            //     }
            // }
            // //협회 ID가 아닌 경우
            // else{
            //     return res.send("You are not association user")
            // }

            if(depth_1 == -1){
                let result_obj = new Object
                let poom_1_count = 0
                let poom_2_count = 0
                let poom_3_count = 0
                let dan_1_count = 0
                let dan_2_count = 0
                let dan_3_count = 0
                let depth_1_info = await models.AS_Poom.findAll({
                    where: {year: year, month: month},
                    attributes: ['depth_1','year','month',
                    'poom_1_count', 'poom_2_count', 'poom_3_count',
                    'dan_1_count', 'dan_2_count', 'dan_3_count'],
                    raw: true,
                })
                for(let depth_1_name of depth_1_info){
                    poom_1_count += depth_1_name.poom_1_count
                    poom_2_count += depth_1_name.poom_2_count
                    poom_3_count += depth_1_name.poom_3_count
                    dan_1_count += depth_1_name.dan_1_count
                    dan_2_count += depth_1_name.dan_2_count
                    dan_3_count += depth_1_name.dan_3_count
                }
                
                result_obj["year"] = year
                result_obj["month"] = month
                result_obj["poom_1_count"] = poom_1_count
                result_obj["poom_2_count"] = poom_2_count
                result_obj["poom_3_count"] = poom_3_count
                result_obj["dan_1_count"] = dan_1_count
                result_obj["dan_2_count"] = dan_2_count
                result_obj["dan_3_count"] = dan_3_count
                    
                return res.send(result_obj)
            }
            else{
                let result_obj = new Object
                let poom_1_count = 0
                let poom_2_count = 0
                let poom_3_count = 0
                let dan_1_count = 0
                let dan_2_count = 0
                let dan_3_count = 0
                let depth_1_info = await models.AS_Poom.findOne({
                    where: {year: year, month: month, depth_1: depth_1},
                    attributes: ['depth_1','year','month',
                    'poom_1_count', 'poom_2_count', 'poom_3_count',
                    'dan_1_count', 'dan_2_count', 'dan_3_count'],
                    raw: true,
                })
                console.log(depth_1_info,"depth_1_info")
                if(depth_1_info){
                    poom_1_count += depth_1_info.poom_1_count
                    poom_2_count += depth_1_info.poom_2_count
                    poom_3_count += depth_1_info.poom_3_count
                    dan_1_count += depth_1_info.dan_1_count
                    dan_2_count += depth_1_info.dan_2_count
                    dan_3_count += depth_1_info.dan_3_count
                }
                result_obj["year"] = year
                result_obj["month"] = month
                result_obj["poom_1_count"] = poom_1_count
                result_obj["poom_2_count"] = poom_2_count
                result_obj["poom_3_count"] = poom_3_count
                result_obj["dan_1_count"] = dan_1_count
                result_obj["dan_2_count"] = dan_2_count
                result_obj["dan_3_count"] = dan_3_count
                    
                return res.send(result_obj)
            }
        }   
        catch(err){
            res.status(500).send({
                message:
                    err.message || "some error occured"
            })
        }
    },

    AS_Cal_Poom_levelup: async (req,res) => {
        /* #swagger.description = "품별 승급 데이터를 테이블에 저장합니다. <br /> 
        전체 조회 시 depth_1에 -1"
        */
        // #swagger.tags = ["통계"]
        // #swagger.summary = "통계 품별 승급 세팅(만들면 안됩니다)"
        try{
            const year = req.params.year
            const month = req.params.month
            for(let region_1depth of region_infos){
                console.log(Object.keys(region_1depth)[0],"Object.keys(region_1depth)")
                let poom_1_levelup_count = 0
                let poom_2_levelup_count = 0
                let poom_3_levelup_count = 0
                let dan_1_levelup_count = 0
                let dan_2_levelup_count = 0
                let dan_3_levelup_count = 0
                //해당되는 지역만 조회
                let dojang_all_info = await models.Dojang.findAll({
                    where: {
                        region_1depth_name: {[Op.like]: '%' + Object.keys(region_1depth)[0] + '%'},
                    },
                    attributes:['id','address_name','road_address','address_detail','region_1depth_name','region_2depth_name','region_3depth_name'],
                    raw: true
                })
                console.log(dojang_all_info,"dojang_all_info")
                for(let dojang of dojang_all_info){
                    let levelup_info = await models.LevelUpInfo.findAll({
                        where: {dojang: dojang.id},
                        attributes: ['id','level_after'],
                        raw:true
                    })
                    console.log(levelup_info,"levelup_info")
                    for(let levelup_one of levelup_info){
                        if(levelup_one.level_after == "1품"){
                            poom_1_levelup_count += 1
                        }
                        if(levelup_one.level_after == "2품"){
                            poom_2_levelup_count += 1
                        }
                        if(levelup_one.level_after == "3품"){
                            poom_3_levelup_count += 1
                        }
                        if(levelup_one.level_after == "1단"){
                            dan_1_levelup_count += 1
                        }
                        if(levelup_one.level_after == "2단"){
                            dan_2_levelup_count += 1
                        }
                        if(levelup_one.level_after == "3단"){
                            dan_3_levelup_count += 1
                        }
                    }
                }
                await models.AS_Poom_levelup.create({
                    year, month, depth_1: Object.keys(region_1depth)[0], 
                    poom_1_levelup_count, poom_2_levelup_count, poom_3_levelup_count,
                    dan_1_levelup_count, dan_2_levelup_count, dan_3_levelup_count,
                })
            }
            res.send("successfully created")
        }   
        catch(err){
            res.status(500).send({
                message:
                    err.message || "some error occured"
            })
        }
    },

    AS_Poom_levelup: async (req,res) => {
        /* #swagger.description = "품별 승급 데이터를 불러옵니다. <br /> 
        전체 조회 시 depth_1에 -1"
        */
        // #swagger.tags = ["협회 통계"]
        // #swagger.summary = "통계 품별 승급 수"
        try{
            const year = req.params.year
            const month = req.params.month
            const depth_1 = req.params.depth_1
            const auth_id = req.id

            // //협회 로그인 정보 조회
            // let login_info = await models.AssociationInfos.findOne({
            //     where: {user:auth_id},
            //     attributes: ['name'],
            //     raw:true
            // })
            // //협회 로그인 정보가 있을시
            // if(login_info){
            //     //한국협회로 로그인 한게 아니라면
            //     if(login_info.name != "한국"){
            //         //call한 params값과 로그인 정보가 다를 경우
            //         if(login_info.name != depth_1){
            //             return res.send("You are not authorized")
            //         }
            //     }
            //     //한국협회로 로그인
            //     else if(login_info.name == "한국"){
            //         if(depth_1 != -1){
            //             return res.send("You are super. you are not low depth")
            //         }
            //     }
            // }
            // //협회 ID가 아닌 경우
            // else{
            //     return res.send("You are not association user")
            // }

            if(depth_1 == -1){
                let result_obj = new Object
                let poom_1_levelup_count = 0
                let poom_2_levelup_count = 0
                let poom_3_levelup_count = 0
                let dan_1_levelup_count = 0
                let dan_2_levelup_count = 0
                let dan_3_levelup_count = 0
                let depth_1_info = await models.AS_Poom_levelup.findAll({
                    where: {year: year, month: month},
                    attributes: ['depth_1','year','month',
                    'poom_1_levelup_count', 'poom_2_levelup_count', 'poom_3_levelup_count',
                    'dan_1_levelup_count', 'dan_2_levelup_count', 'dan_3_levelup_count'],
                    raw: true,
                })
                for(let depth_1_name of depth_1_info){
                    poom_1_levelup_count += depth_1_name.poom_1_levelup_count
                    poom_2_levelup_count += depth_1_name.poom_2_levelup_count
                    poom_3_levelup_count += depth_1_name.poom_3_levelup_count
                    dan_1_levelup_count += depth_1_name.dan_1_levelup_count
                    dan_2_levelup_count += depth_1_name.dan_2_levelup_count
                    dan_3_levelup_count += depth_1_name.dan_3_levelup_count
                }
                
                result_obj["year"] = year
                result_obj["month"] = month
                result_obj["poom_1_levelup_count"] = poom_1_levelup_count
                result_obj["poom_2_levelup_count"] = poom_2_levelup_count
                result_obj["poom_3_levelup_count"] = poom_3_levelup_count
                result_obj["dan_1_levelup_count"] = dan_1_levelup_count
                result_obj["dan_2_levelup_count"] = dan_2_levelup_count
                result_obj["dan_3_levelup_count"] = dan_3_levelup_count
                    
                return res.send(result_obj)
            }
            else{
                let result_obj = new Object
                let poom_1_levelup_count = 0
                let poom_2_levelup_count = 0
                let poom_3_levelup_count = 0
                let dan_1_levelup_count = 0
                let dan_2_levelup_count = 0
                let dan_3_levelup_count = 0
                let depth_1_info = await models.AS_Poom_levelup.findOne({
                    where: {year: year, month: month, depth_1: depth_1},
                    attributes: ['depth_1','year','month',
                    'poom_1_levelup_count', 'poom_2_levelup_count', 'poom_3_levelup_count',
                    'dan_1_levelup_count', 'dan_2_levelup_count', 'dan_3_levelup_count'],
                    raw: true,
                })
                console.log(depth_1_info,"depth_1_info")
                if(depth_1_info){
                    poom_1_levelup_count += depth_1_info.poom_1_levelup_count
                    poom_2_levelup_count += depth_1_info.poom_2_levelup_count
                    poom_3_levelup_count += depth_1_info.poom_3_levelup_count
                    dan_1_levelup_count += depth_1_info.dan_1_levelup_count
                    dan_2_levelup_count += depth_1_info.dan_2_levelup_count
                    dan_3_levelup_count += depth_1_info.dan_3_levelup_count
                }
                result_obj["year"] = year
                result_obj["month"] = month
                result_obj["poom_1_levelup_count"] = poom_1_levelup_count
                result_obj["poom_2_levelup_count"] = poom_2_levelup_count
                result_obj["poom_3_levelup_count"] = poom_3_levelup_count
                result_obj["dan_1_levelup_count"] = dan_1_levelup_count
                result_obj["dan_2_levelup_count"] = dan_2_levelup_count
                result_obj["dan_3_levelup_count"] = dan_3_levelup_count
                    
                return res.send(result_obj)
            }
        }   
        catch(err){
            res.status(500).send({
                message:
                    err.message || "some error occured"
            })
        }
    },

    AS_levelup_info_read: async (req,res) => {
        /* #swagger.description = "승급 이력를 불러옵니다. <br /> 
        */
        // #swagger.tags = ["협회"]
        // #swagger.summary = "협회용 승급 이력 조회"
        /* #swagger.parameters['page'] = {
            in: "query",
            description: "페이지",
            type: "integer"
        },
        #swagger.parameters['dojang_name'] = {
            in: "query",
            description: "도장 이름",
            type: "string"
        }
        */
        try{
            const year = req.params.year
            const month = req.params.month
            const depth_1 = req.params.depth_1
            const depth_2 = req.params.depth_2
            const dojang_name = req.query.dojang_name
            const auth_id = req.id
            let result_obj = new Object
            let result_arr = []
            let pageNum = req.query.page; // 요청 페이지 넘버
            let offset = 0;
            if(pageNum > 1){
                offset = 30 * (pageNum - 1);
            }
            
            // //협회 로그인 정보 조회
            // let login_info = await models.AssociationInfos.findOne({
            //     where: {user:auth_id},
            //     attributes: ['name'],
            //     raw:true
            // })
            // console.log(login_info,"login_info")
            // //협회 로그인 정보가 있을시
            // if(login_info){
            //     //한국협회로 로그인 한게 아니라면
            //     if(login_info.name != "한국"){
            //         //call한 params값과 로그인 정보가 다를 경우
            //         if(login_info.name != depth_1){
            //             return res.send("You are not authorized")
            //         }
            //     }
            //     //한국협회로 로그인
            //     else if(login_info.name == "한국"){
            //         if(depth_1 != -1){
            //             return res.send("You are super. you are not low depth")
            //         }
            //     }
            // }
            // //협회 ID가 아닌 경우
            // else{
            //     return res.send("You are not association user")
            // }

            //대한 태권도 협회 (지역을 나눌 필요 없음)
            if(depth_1 == -1){
                //전체 지역 검색 
                if(depth_2 == -1){
                    //dojang_name query가 입력되지 않았을시 즉 전체 검색
                    if(!dojang_name){
                        let levelup_cnt = await models.LevelUpInfo.findAll({
                            where: {
                                createdAt: sequelize.where(sequelize.fn('YEAR', sequelize.col('createdAt')), year),
                                [Op.and]: sequelize.where(sequelize.fn('MONTH', sequelize.col('createdAt')), month)},
                            raw: true
                        })
                        let levelup_info = await models.LevelUpInfo.findAll({
                            where: {
                                createdAt: sequelize.where(sequelize.fn('YEAR', sequelize.col('createdAt')), year),
                                [Op.and]: sequelize.where(sequelize.fn('MONTH', sequelize.col('createdAt')), month)},
                            // attributes: ['id','dojang_name','last_name','first_name','sex',['dob','age'],['student','student_id'],'level_after','createdAt'],
                            order: [['levelup_date','desc']],
                            offset: offset,
                            limit: 30,
                            raw: true
                        })
                        console.log(levelup_info,"levelup_info")
                        for(let levelup_one of levelup_info){
                            let year_now = new Date(Date.now())
                            year_now = year_now.getFullYear()
                            if(levelup_one.age){
                                levelup_one.age = year_now-levelup_one.age.split('-')[0]
                            }
                        }
                        result_obj["count"] = levelup_cnt.length
                        result_obj["levelup_info"] = levelup_info
                        return res.send(result_obj)
                    }
                    else if(dojang_name){
                        let dojang_id_info = await models.Dojang.findAll({
                            where: {name:{[Op.like]: '%' + dojang_name + '%'}},
                            attributes: ['id'],
                            raw:true
                        })
                        console.log(dojang_id_info,"dojang_id_info")
                        for(let dojang_one_info of dojang_id_info){
                            let levelup_count = await models.LevelUpInfo.findAll({
                                where: {
                                    dojang: dojang_one_info.id,
                                    createdAt: sequelize.where(sequelize.fn('YEAR', sequelize.col('createdAt')), year),
                                    [Op.and]: sequelize.where(sequelize.fn('MONTH', sequelize.col('createdAt')), month)},
                                // attributes: ['id',['dojang','dojang_id'],'dojang_name','last_name','first_name','sex',['dob','age'],['student','student_id'],'level_after','createdAt'],
                                order: [['levelup_date','desc']],
                                raw: true
                            })
                            let levelup_info = await models.LevelUpInfo.findAll({
                                where: {
                                    dojang: dojang_one_info.id,
                                    createdAt: sequelize.where(sequelize.fn('YEAR', sequelize.col('createdAt')), year),
                                    [Op.and]: sequelize.where(sequelize.fn('MONTH', sequelize.col('createdAt')), month)},
                                // attributes: ['id',['dojang','dojang_id'],'dojang_name','last_name','first_name','sex',['dob','age'],['student','student_id'],'level_after','createdAt'],
                                order: [['levelup_date','desc']],
                                offset: offset,
                                limit: 30,
                                raw: true
                            })
                            console.log(levelup_info,"levelup_info")
                            for(let levelup_one of levelup_info){
                                if(levelup_one){
                                    if(levelup_one.age){
                                        let year_now = new Date(Date.now())
                                        year_now = year_now.getFullYear()
                                        levelup_one.age = year_now-levelup_one.age.split('-')[0]
                                    }
                                }
                                result_arr.push(levelup_one)
                            }
                            result_obj["count"] = levelup_count.length
                        }
                        
                        result_obj["levelup_info"] = result_arr
                        return res.send(result_obj)
                    }
                }
                //대한 태권도 협회 -> 지역 선택 서울,경기....
                else{
                    //각 지역마다 전체 검색
                    if(!dojang_name){
                        console.log("@@@@@")
                        let dojang_all_info = await models.Dojang.findAll({
                            where:{
                                region_1depth_name: {[Op.like]: '%' + depth_2 + '%'}
                            },
                            attributes:['id','address_name','road_address','address_detail','region_1depth_name','region_2depth_name','region_3depth_name'],
                            raw: true
                        })
                        console.log(dojang_all_info,"dojang_all_info")
                        for(let dojang_one_info of dojang_all_info){
                            count_arr = []
                            let levelup_count = await models.LevelUpInfo.findAll({
                                where: {
                                    dojang: dojang_one_info.id,
                                    createdAt: sequelize.where(sequelize.fn('YEAR', sequelize.col('createdAt')), year),
                                    [Op.and]: sequelize.where(sequelize.fn('MONTH', sequelize.col('createdAt')), month)},
                                // attributes: ['id','dojang_name','last_name','first_name','sex',['dob','age'],['student','student_id'],'level_after','createdAt'],
                                order: [['levelup_date','desc']],
                                raw: true
                            })
                            console.log(levelup_count.length,"levelup_count.length")
                            let levelup_info = await models.LevelUpInfo.findAll({
                                where: {
                                    dojang: dojang_one_info.id,
                                    createdAt: sequelize.where(sequelize.fn('YEAR', sequelize.col('createdAt')), year),
                                    [Op.and]: sequelize.where(sequelize.fn('MONTH', sequelize.col('createdAt')), month)},
                                // attributes: ['id','dojang_name','last_name','first_name','sex',['dob','age'],['student','student_id'],'level_after','createdAt'],
                                order: [['levelup_date','desc']],
                                offset: offset,
                                limit: 30,
                                raw: true
                            })
                            for(let levelup_count_one of levelup_count){
                                count_arr.push(levelup_count_one)
                            }
                            for(let levelup_one of levelup_info){
                                let year_now = new Date(Date.now())
                                year_now = year_now.getFullYear()
                                if(levelup_one.age){
                                    levelup_one.age = year_now-levelup_one.age.split('-')[0]
                                }
                                result_arr.push(levelup_one)
                            }
                            result_obj["count"] = levelup_count.length
                            result_obj["levelup_info"] = result_arr
                            return res.send(result_obj)
                        }
                    }
                    //각 지역마다 도장 검색
                    else if(dojang_name){
                        let result_arr = []
                        let dojang_one_info = await models.Dojang.findOne({
                            where: [
                                {region_1depth_name: {[Op.like]: '%' + depth_2 + '%'}},
                                {name:{[Op.like]: '%' + dojang_name + '%'}}
                            ],
                            attributes:['id','address_name','road_address','address_detail','region_1depth_name','region_2depth_name','region_3depth_name'],
                            raw: true
                        })
                        console.log(dojang_one_info,"dojang_one_info")
                        if(dojang_one_info){
                            let levelup_count = await models.LevelUpInfo.findAll({
                                where: {
                                    dojang: dojang_one_info.id,
                                    createdAt: sequelize.where(sequelize.fn('YEAR', sequelize.col('createdAt')), year),
                                    [Op.and]: sequelize.where(sequelize.fn('MONTH', sequelize.col('createdAt')), month)},
                                // attributes: ['id','dojang_name','last_name','first_name','sex',['dob','age'],['student','student_id'],'level_after','createdAt'],
                                order: [['levelup_date','desc']],
                                raw: true
                            })
                            let levelup_info = await models.LevelUpInfo.findAll({
                                where: {
                                    dojang: dojang_one_info.id,
                                    createdAt: sequelize.where(sequelize.fn('YEAR', sequelize.col('createdAt')), year),
                                    [Op.and]: sequelize.where(sequelize.fn('MONTH', sequelize.col('createdAt')), month)},
                                // attributes: ['id','dojang_name','last_name','first_name','sex',['dob','age'],['student','student_id'],'level_after','createdAt'],
                                order: [['levelup_date','desc']],
                                offset: offset,
                                limit: 30,
                                raw: true
                            })
                            for(let levelup_one of levelup_info){
                                let year_now = new Date(Date.now())
                                year_now = year_now.getFullYear()
                                if(levelup_one.age){
                                    levelup_one.age = year_now-levelup_one.age.split('-')[0]
                                }
                                result_arr.push(levelup_one)
                            }
                            result_obj["count"] = levelup_count.length
                            result_obj["levelup_info"] = result_arr
                        }
                    return res.send(result_obj)
                    }
                }
            }
            //지역 태권도 협회
            else {
                //전체 조회
                if(depth_2 == -1){
                    if(!dojang_name){
                        //지역 필터
                        let result_arr = []
                        let dojang_all_info = await models.Dojang.findAll({
                            where: {
                                region_1depth_name: {[Op.like]: '%' + depth_1 + '%'},
                            },
                            attributes:['id','address_name','road_address','address_detail','region_1depth_name','region_2depth_name','region_3depth_name'],
                            raw: true
                        })
                        console.log(dojang_all_info,"dojang_all_info")
                        for(let dojang_one_info of dojang_all_info){

                            let levelup_count = await models.LevelUpInfo.findAll({
                                where: {
                                    dojang: dojang_one_info.id,
                                    createdAt: sequelize.where(sequelize.fn('YEAR', sequelize.col('createdAt')), year),
                                    [Op.and]: sequelize.where(sequelize.fn('MONTH', sequelize.col('createdAt')), month)},
                                raw: true
                            })
                            let levelup_info = await models.LevelUpInfo.findAll({
                                where: {
                                    dojang: dojang_one_info.id,
                                    createdAt: sequelize.where(sequelize.fn('YEAR', sequelize.col('createdAt')), year),
                                    [Op.and]: sequelize.where(sequelize.fn('MONTH', sequelize.col('createdAt')), month)},
                                // attributes: ['id','dojang_name','last_name','first_name','sex',['dob','age'],['student','student_id'],'level_after','createdAt'],
                                order: [['levelup_date','desc']],
                                offset: offset,
                                limit: 30,
                                raw: true
                            })
                            for(let levelup_one of levelup_info){
                                let year_now = new Date(Date.now())
                                year_now = year_now.getFullYear()
                                if(levelup_one.age){
                                    levelup_one.age = year_now-levelup_one.age.split('-')[0]
                                }
                                result_arr.push(levelup_one)
                            }
                            result_obj["count"] = levelup_count.length
                            result_obj["levelup_info"] = result_arr
                            return res.send(result_obj)
                        }
                    }
                    else if(dojang_name){
                        //지역 필터
                        let result_arr = []
                        let dojang_all_info = await models.Dojang.findAll({
                            where: {
                                region_1depth_name: {[Op.like]: '%' + depth_1 + '%'},
                                name:{[Op.like]: '%' + dojang_name + '%'}
                            },
                            attributes:['id','address_name','road_address','address_detail','region_1depth_name','region_2depth_name','region_3depth_name'],
                            raw: true
                        })
                        for(let dojang_one_info of dojang_all_info){
                            let levelup_count = await models.LevelUpInfo.findAll({
                                where: {
                                    dojang: dojang_one_info.id,
                                    createdAt: sequelize.where(sequelize.fn('YEAR', sequelize.col('createdAt')), year),
                                    [Op.and]: sequelize.where(sequelize.fn('MONTH', sequelize.col('createdAt')), month)},
                                raw: true
                            })
                            let levelup_info = await models.LevelUpInfo.findAll({
                                where: {
                                    dojang: dojang_one_info.id,
                                    createdAt: sequelize.where(sequelize.fn('YEAR', sequelize.col('createdAt')), year),
                                    [Op.and]: sequelize.where(sequelize.fn('MONTH', sequelize.col('createdAt')), month)},
                                // attributes: ['id','dojang_name','last_name','first_name','sex',['dob','age'],['student','student_id'],'level_after','createdAt'],
                                order: [['levelup_date','desc']],
                                offset: offset,
                                limit: 30,
                                raw: true
                            })
                            for(let levelup_one of levelup_info){
                                let year_now = new Date(Date.now())
                                year_now = year_now.getFullYear()
                                if(levelup_one.age){
                                    levelup_one.age = year_now-levelup_one.age.split('-')[0]
                                }
                                result_arr.push(levelup_one)
                            }
                            result_obj["count"] = levelup_count.length
                            result_obj["levelup_info"] = result_arr
                        }
                        return res.send(result_obj)
                    }
                }
                //구 or 시(군) 조회 
                else{
                    if(!dojang_name){
                        console.log("$#$#$")
                        let result_arr = []
                        let dojang_all_info = await models.Dojang.findAll({
                            where: {
                                region_1depth_name: {[Op.like]: '%' + depth_1 + '%'},
                                region_2depth_name: {[Op.like]: '%' + depth_2 + '%'},
                            },
                            attributes:['id','address_name','road_address','address_detail','region_1depth_name','region_2depth_name','region_3depth_name'],
                            raw: true
                        })
                        console.log(dojang_all_info,"dojang_all_info")
                        for(let dojang_one_info of dojang_all_info){
                            let levelup_count = await models.LevelUpInfo.findAll({
                                where: {
                                    dojang: dojang_one_info.id,
                                    createdAt: sequelize.where(sequelize.fn('YEAR', sequelize.col('createdAt')), year),
                                    [Op.and]: sequelize.where(sequelize.fn('MONTH', sequelize.col('createdAt')), month)},
                                raw: true
                            })
                            let levelup_info = await models.LevelUpInfo.findAll({
                                where: {
                                    dojang: dojang_one_info.id,
                                    createdAt: sequelize.where(sequelize.fn('YEAR', sequelize.col('createdAt')), year),
                                    [Op.and]: sequelize.where(sequelize.fn('MONTH', sequelize.col('createdAt')), month)},
                                // attributes: ['id','dojang_name','last_name','first_name','sex',['dob','age'],['student','student_id'],'level_after','createdAt'],
                                order: [['levelup_date','desc']],
                                offset: offset,
                                limit: 30,
                                raw: true
                            })
                            console.log(levelup_info,"levelup_info")
                            for(let levelup_one of levelup_info){
                                let year_now = new Date(Date.now())
                                year_now = year_now.getFullYear()
                                if(levelup_one.age){
                                    levelup_one.age = year_now-levelup_one.age.split('-')[0]
                                }
                                result_arr.push(levelup_one)
                            }
                            result_obj["count"] = levelup_count.length
                            result_obj["levelup_info"] = result_arr
                            return res.send(result_obj)
                        }
                    }
                    else if(dojang_name){
                        //지역 필터
                        let result_arr = []
                        let dojang_all_info = await models.Dojang.findAll({
                            where: {
                                region_1depth_name: {[Op.like]: '%' + depth_1 + '%'},
                                region_2depth_name: {[Op.like]: '%' + depth_2 + '%'},
                                name:{[Op.like]: '%' + dojang_name + '%'}
                            },
                            attributes:['id','address_name','road_address','address_detail','region_1depth_name','region_2depth_name','region_3depth_name'],
                            raw: true
                        })
                        for(let dojang_one_info of dojang_all_info){
                            let levelup_count = await models.LevelUpInfo.findAll({
                                where: {
                                    dojang: dojang_one_info.id,
                                    createdAt: sequelize.where(sequelize.fn('YEAR', sequelize.col('createdAt')), year),
                                    [Op.and]: sequelize.where(sequelize.fn('MONTH', sequelize.col('createdAt')), month)},
                                raw: true
                            })
                            let levelup_info = await models.LevelUpInfo.findAll({
                                where: {
                                    dojang: dojang_one_info.id,
                                    createdAt: sequelize.where(sequelize.fn('YEAR', sequelize.col('createdAt')), year),
                                    [Op.and]: sequelize.where(sequelize.fn('MONTH', sequelize.col('createdAt')), month)},
                                // attributes: ['id','dojang_name','last_name','first_name','sex',['dob','age'],['student','student_id'],'level_after','createdAt'],
                                order: [['levelup_date','desc']],
                                offset: offset,
                                limit: 30,
                                raw: true
                            })
                            for(let levelup_one of levelup_info){
                                let year_now = new Date(Date.now())
                                year_now = year_now.getFullYear()
                                if(levelup_one.age){
                                    levelup_one.age = year_now-levelup_one.age.split('-')[0]
                                }
                                result_arr.push(levelup_one)
                            }
                            result_obj["count"] = levelup_count.length
                            result_obj["levelup_info"] = result_arr
                        }
                        return res.send(result_obj)
                    }
                }
            }
        }   
        catch(err){
            res.status(500).send({
                message:
                    err.message || "some error occured"
            })
        }
    },

    AS_DojangRead: async (req,res) => {
        // #swagger.description = "협회 페이지 도장 정보."
        // #swagger.tags = ["협회 통계"]
        // #swagger.summary = "협회 도장 정보"
        try{
            const dojang_id = req.params.dojang_id

            let dojang_info = await models.Dojang.findOne({
                where: {id:dojang_id},
                attributes: ['name', 'logo_img', 'phone_number','address_name','address_detail'],
                raw:true
            })
            let kwanjangdojang_info = await models.KwanjangDojang.findAll({
                where: {dojang: dojang_id},
                attributes:['kwanjang'],
                raw:true
            }) 
            let kwanjang_arr = []
            for(let kwanjang_one of kwanjangdojang_info){
                let kwanjang_info = await models.KwanjangInfo.findOne({
                    where: {id: kwanjang_one.kwanjang},
                    attributes: ['id','last_name','first_name','phone_number']
                })
                kwanjang_arr.push(kwanjang_info)
            }
            let sabumdojang_info = await models.SabumDojang.findAll({
                where: {dojang: dojang_id},
                attributes: ['sabum'],
                raw:true
            })
            let student_info = await models.StudentInfo.findAll({
                where: {dojang: dojang_id},
                attributes: ['id'],
                raw:true
            })
            dojang_info['kwanjang_info'] = kwanjang_arr
            dojang_info['sabum_count'] = sabumdojang_info.length
            dojang_info['student_count'] = student_info.length
            return res.send(dojang_info)
        }
        catch(err){
            await res.status(500).send({
                message:
                    err.message || "some error occured"
            })
        }
    },

    AS_StudentRead: async (req,res) => {
        // #swagger.description = "협회 페이지 도장 정보."
        // #swagger.tags = ["협회"]
        // #swagger.summary = "협회 도장 정보"
        try{
            const student_id = req.params.student_id

            let student_info = await models.StudentInfo.findOne({
                where: {id: student_id},
                attributes: ['photo_url','last_name','first_name','sex','dob','height','weight','career','level','dojang'],
                raw: true
            })
            let dojang_info = await models.Dojang.findOne({
                where: {id:student_info.dojang},
                attributes: ['name'],
                raw: true
            })
            student_info['dojang_name'] = dojang_info.name
            return res.send(student_info)
        }
        catch(err){
            await res.status(500).send({
                message:
                    err.message || "some error occured"
            })
        }
    },

    AS_Dojang_info_read: async (req,res) => {
        /* #swagger.description = "협회 페이지 도장 현황을 불러옵니다. <br />
        협회를 -1로 설정할경우 한국전체, dojang을 0으로 설정할 경우 협회에 따른 전체 도장이 조회 됩니다 
        */
        // #swagger.tags = ["협회 통계"]
        // #swagger.summary = "협회용 도장 현황 조회"
        /* #swagger.parameters['page'] = {
            in: "query",
            description: "페이지",
            type: "integer"
        },
        #swagger.parameters['dojang_name'] = {
            in: "query",
            description: "도장 이름",
            type: "string"
        }
        */
        try{
            const depth_1 = req.params.depth_1
            const depth_2 = req.params.depth_2
            const dojang_name = req.query.dojang_name
            const auth_id = req.id
            let result_obj = new Object

            let pageNum = req.query.page; // 요청 페이지 넘버
            let offset = 0;
            if(pageNum > 1){
                offset = 30 * (pageNum - 1);
            }

            // //협회 로그인 정보 조회
            // let login_info = await models.AssociationInfos.findOne({
            //     where: {user:auth_id},
            //     attributes: ['name'],
            //     raw:true
            // })
            // console.log(login_info,"login_info")
            // //협회 로그인 정보가 있을시
            // if(login_info){
            //     //한국협회로 로그인 한게 아니라면
            //     if(login_info.name != "한국"){
            //         //call한 params값과 로그인 정보가 다를 경우
            //         if(login_info.name != depth_1){
            //             return res.send("You are not authorized")
            //         }
            //     }
            //     //한국협회로 로그인
            //     else if(login_info.name == "한국"){
            //         if(depth_1 != -1){
            //             return res.send("You are super. you are not low depth")
            //         }
            //     }
            // }
            // //협회 ID가 아닌 경우
            // else{
            //     return res.send("You are not association user")
            // }

            //시작!!!!!
            //대한 태권도 협회 (지역을 나눌 필요 없음)
            if(depth_1 == -1){
                //전체 검색 
                if(depth_2 == -1){
                    if(!dojang_name){
                        let dojang_count = await models.Dojang.findAll({
                            attributes: ['id','name','phone_number'],
                            raw:true
                        })
                        let dojang_info = await models.Dojang.findAll({
                            attributes: ['id','name','phone_number'],
                            offset: offset,
                            limit: 30,
                            raw:true
                        })
                        for(let dojang_one of dojang_info){
                            let sabumdojang_info = await models.SabumDojang.findAll({
                                where: {dojang:dojang_one.id},
                                attributes: ['sabum'],
                                raw:true
                            })
                            let student_info = await models.StudentInfo.findAll({
                                where: {dojang: dojang_one.id},
                                attributes: ['id'],
                                raw:true
                            })
                            dojang_one['sabum_count'] = sabumdojang_info.length
                            dojang_one['student_count'] = student_info.length
                        }
                        result_obj['count'] = dojang_count.length
                        result_obj['dojang_info'] = dojang_info
                        return res.send(result_obj) 
                    }
                    else if(dojang_name){
                        let dojang_count = await models.Dojang.findAll({
                            where: {name:{[Op.like]: '%' + dojang_name + '%'}},
                            raw:true
                        })
                        let dojang_info = await models.Dojang.findAll({
                            where: {name:{[Op.like]: '%' + dojang_name + '%'}},
                            attributes: ['id','name','phone_number'],
                            offset: offset,
                            limit: 30,
                            raw:true
                        })
                        for(let dojang_one_info of dojang_info){
                            let sabumdojang_info = await models.SabumDojang.findAll({
                                where: {dojang:dojang_one_info.id},
                                attributes: ['sabum'],
                                raw:true
                            })
                            let student_info = await models.StudentInfo.findAll({
                                where: {dojang: dojang_one_info.id},
                                attributes: ['id'],
                                raw:true
                            })
                            dojang_one_info['sabum_count'] = sabumdojang_info.length
                            dojang_one_info['student_count'] = student_info.length
                        }
                        result_obj['count'] = dojang_count.length
                        result_obj['dojang_info'] = dojang_info
                        return res.send(result_obj)                   
                    }
                }
                //한국 협회 -> 지역 설정
                else{
                    //전체 조회
                    if(!dojang_name){
                        let dojang_count = await models.Dojang.findAll({
                            where: {
                                region_1depth_name: {[Op.like]: '%' + depth_2 + '%'},
                            },
                            raw:true
                        })
                        let dojang_info = await models.Dojang.findAll({
                            where: {
                                region_1depth_name: {[Op.like]: '%' + depth_2 + '%'},
                            },
                            attributes: ['id','name','phone_number'],
                            offset: offset,
                            limit: 30,
                            raw:true
                        })
                        for(let dojang_one of dojang_info){
                            let sabumdojang_info = await models.SabumDojang.findAll({
                                where: {dojang:dojang_one.id},
                                attributes: ['sabum'],
                                offset: offset,
                                limit: 30,
                                raw:true
                            })
                            let student_info = await models.StudentInfo.findAll({
                                where: {dojang: dojang_one.id},
                                attributes: ['id'],
                                raw:true
                            })
                            dojang_one['sabum_count'] = sabumdojang_info.length
                            dojang_one['student_count'] = student_info.length
                        }
                        result_obj['count'] = dojang_count.length
                        result_obj['dojang_info'] = dojang_info
                        return res.send(result_obj)   
                    }
                    else if(dojang_name){
                        let dojang_count = await models.Dojang.findAll({
                            where: {
                                region_1depth_name: {[Op.like]: '%' + depth_2 + '%'},
                                name:{[Op.like]: '%' + dojang_name + '%'},
                            },
                            raw:true
                        })
                        let dojang_info = await models.Dojang.findAll({
                            where: {
                                region_1depth_name: {[Op.like]: '%' + depth_2 + '%'},
                                name:{[Op.like]: '%' + dojang_name + '%'},
                            },
                            attributes: ['id','name','phone_number'],
                            offset: offset,
                            limit: 30,
                            raw:true
                        })
                        for(let dojang_one_info of dojang_info){
                            let sabumdojang_info = await models.SabumDojang.findAll({
                                where: {dojang:dojang_one_info.id},
                                attributes: ['sabum'],
                                raw:true
                            })
                            let student_info = await models.StudentInfo.findAll({
                                where: {dojang: dojang_one_info.id},
                                attributes: ['id'],
                                raw:true
                            })
                            dojang_one_info['sabum_count'] = sabumdojang_info.length
                            dojang_one_info['student_count'] = student_info.length
                        }
                        result_obj['count'] = dojang_count.length
                        result_obj['dojang_info'] = dojang_info
                        return res.send(result_obj)                     
                    }
                }
            }
            //지역 태권도 협회
            else {
                if(depth_2 == -1){
                // 지역 중 특정 도장 검색
                    if(!dojang_name){
                        let dojang_count = await models.Dojang.findAll({
                            where: {
                                region_1depth_name: {[Op.like]: '%' + depth_1 + '%'},
                            },
                            raw:true
                        })
                        //지역 필터
                        let dojang_info = await models.Dojang.findAll({
                            where: {
                                region_1depth_name: {[Op.like]: '%' + depth_1 + '%'},
                            },
                            attributes: ['id','name','phone_number'],
                            offset: offset,
                            limit: 30,
                            raw:true
                        })
                        for(let dojang_one of dojang_info){
                            let sabumdojang_info = await models.SabumDojang.findAll({
                                where: {dojang:dojang_one.id},
                                attributes: ['sabum'],
                                offset: offset,
                                limit: 30,
                                raw:true
                            })
                            let student_info = await models.StudentInfo.findAll({
                                where: {dojang: dojang_one.id},
                                attributes: ['id'],
                                raw:true
                            })
                            dojang_one['sabum_count'] = sabumdojang_info.length
                            dojang_one['student_count'] = student_info.length
                        }
                        result_obj['count'] = dojang_count.length
                        result_obj['dojang_info'] = dojang_info
                        return res.send(result_obj)   
                    }
                    else if(dojang_name){
                        let dojang_count = await models.Dojang.findAll({
                            where: {
                                region_1depth_name: {[Op.like]: '%' + depth_1 + '%'},
                                name:{[Op.like]: '%' + dojang_name + '%'}
                            },
                            raw:true
                        })
                        let dojang_info = await models.Dojang.findAll({
                            where: {
                                region_1depth_name: {[Op.like]: '%' + depth_1 + '%'},
                                name:{[Op.like]: '%' + dojang_name + '%'}
                            },
                            attributes: ['id','name','phone_number'],
                            offset: offset,
                            limit: 30,
                            raw:true
                        })
                        for(let dojang_one of dojang_info){
                            let sabumdojang_info = await models.SabumDojang.findAll({
                                where: {dojang:dojang_one.id},
                                attributes: ['sabum'],
                                offset: offset,
                                limit: 30,
                                raw:true
                            })
                            let student_info = await models.StudentInfo.findAll({
                                where: {dojang: dojang_one.id},
                                attributes: ['id'],
                                raw:true
                            })
                            dojang_one['sabum_count'] = sabumdojang_info.length
                            dojang_one['student_count'] = student_info.length
                        }
                        result_obj['count'] = dojang_count.length
                        result_obj['dojang_info'] = dojang_info
                        return res.send(result_obj)   
                    }
                }
                //지역 협회 -> 구, 시(군) 조회
                else{
                    if(!dojang_name){
                        let dojang_count = await models.Dojang.findAll({
                            where: {
                                region_1depth_name: {[Op.like]: '%' + depth_1 + '%'},
                                region_2depth_name: {[Op.like]: '%' + depth_2 + '%'},
                            },
                            raw:true
                        })
                        //지역 필터
                        let dojang_info = await models.Dojang.findAll({
                            where: {
                                region_1depth_name: {[Op.like]: '%' + depth_1 + '%'},
                                region_2depth_name: {[Op.like]: '%' + depth_2 + '%'},
                            },
                            attributes: ['id','name','phone_number'],
                            offset: offset,
                            limit: 30,
                            raw:true
                        })
                        for(let dojang_one of dojang_info){
                            let sabumdojang_info = await models.SabumDojang.findAll({
                                where: {dojang:dojang_one.id},
                                attributes: ['sabum'],
                                offset: offset,
                                limit: 30,
                                raw:true
                            })
                            let student_info = await models.StudentInfo.findAll({
                                where: {dojang: dojang_one.id},
                                attributes: ['id'],
                                raw:true
                            })
                            dojang_one['sabum_count'] = sabumdojang_info.length
                            dojang_one['student_count'] = student_info.length
                        }
                        result_obj['count'] = dojang_count.length
                        result_obj['dojang_info'] = dojang_info
                        return res.send(result_obj)   
                    }
                    else if(dojang_name){
                        let dojang_count = await models.Dojang.findAll({
                            where: {
                                region_1depth_name: {[Op.like]: '%' + depth_1 + '%'},
                                region_2depth_name: {[Op.like]: '%' + depth_2 + '%'},
                                name:{[Op.like]: '%' + dojang_name + '%'}
                            },
                            raw:true
                        })
                        let dojang_info = await models.Dojang.findAll({
                            where: {
                                region_1depth_name: {[Op.like]: '%' + depth_1 + '%'},
                                region_2depth_name: {[Op.like]: '%' + depth_2 + '%'},
                                name:{[Op.like]: '%' + dojang_name + '%'}
                            },
                            attributes: ['id','name','phone_number'],
                            offset: offset,
                            limit: 30,
                            raw:true
                        })
                        for(let dojang_one of dojang_info){
                            let sabumdojang_info = await models.SabumDojang.findAll({
                                where: {dojang:dojang_one.id},
                                attributes: ['sabum'],
                                offset: offset,
                                limit: 30,
                                raw:true
                            })
                            let student_info = await models.StudentInfo.findAll({
                                where: {dojang: dojang_one.id},
                                attributes: ['id'],
                                raw:true
                            })
                            dojang_one['sabum_count'] = sabumdojang_info.length
                            dojang_one['student_count'] = student_info.length
                        }
                        result_obj['count'] = dojang_count.length
                        result_obj['dojang_info'] = dojang_info
                        return res.send(result_obj)   
                    }
                }
            }
        }   
        catch(err){
            res.status(500).send({
                message:
                    err.message || "some error occured"
            })
        }
    },
}
