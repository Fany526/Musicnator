const express = require ('express');
const path = require('path');
const {engine} = require ('express-handlebars');
let instrumentos = require('./instrumentos.js');
const preguntasC = require('./preguntasC.js');
const preguntasP = require('./preguntasP.js');
const preguntasV = require('./preguntasV.js');
let claves = require('./claves.js');


//Inicializar app 
const app = express ();
app.use(express.static('public'));

//Registro del Template engine
app.engine ('handlebars', engine());
app.set ('view engine', 'handlebars');
app.set ('views', './views');

//Variables
let questionNum = 0;
let preg_preg = 1;
let listo = false;
let ignoto = {};
let current = "Por favor ingrese el tipo de su instrumento:";
let probables = [];
let newQ = "";
let idNewQ = 0;
let keyS = "";
let idNewC = 0;

app.get ('/', (req, res) => {
    if (JSON.stringify(ignoto) != "{}") { //Adivinar un nuevo instrumento
        //Reiniciar las variables
        preg_preg = 1;
        questionNum = 0;
        ignoto = {};
        probables = [];
        current = "Por favor ingrese el tipo de su instrumento:"
        listo = false;
        res.render ('index');
    } else {
        res.render ('index');
    }
});

app.get ('/tipoInstrumento', (req, res) => {
    res.render ('tipoInstrumento', {id:preg_preg,pregunta:current});
    if(req.query.inicio == "true"){
        ignoto = { };
    }
    questionNum = questionNum+1;
});

app.get('/pregunta', (req,res)=>{
    preg_preg += 1;
    res.render ('pregunta', {id:preg_preg, pregunta:current});
})

//Añadir un nuevo Instrumento
app.get('/addInstrument', (req,res)=>{
    ignoto.nombre = req.query.nombre;
    let clave = req.query.clave;
    let type = ignoto.tipo_instru;
    newQ = req.query.pregunta; //La pregunta que nos mandó el usuario
    idNewQ = questionNum; //ID de la pregunta que vamos a 
    idNewC = questionNum;
    newKey(type,idNewC,clave);// Llamamos a la función para generar lanueva clave
    newQuestion(type,idNewQ,newQ); // LLamamos a la función para agregar la pregunta
    updateInstrumentos(clave);
    res.redirect ('/');
})

app.get('/process', (req,res)=>{
    if (req.query.tipoInstrumento != undefined) {
        ignoto.tipo_instru = req.query.tipoInstrumento;
        if (ignoto.tipo_instru == "cuerda") {
            cuerda (questionNum, undefined);
        }
        if (ignoto.tipo_instru == "percusion") {
            percusion (questionNum, undefined);
        }
        if (ignoto.tipo_instru == "viento") {
            viento (questionNum, undefined);
        }
        res.redirect('/pregunta');
    } else {
        if (!listo) {//Si aún no terminan las preguntas
            if (ignoto.tipo_instru == "cuerda") {
                questionNum = cuerda (questionNum, req.query.response);
                if (questionNum < 0) {
                    questionNum = questionNum*(-1);
                    probables = adivinar();
                    res.redirect ('/adivinar');
                    return;
                }
            } else if (ignoto.tipo_instru == "percusion") {
                questionNum = percusion (questionNum, req.query.response);
                if (questionNum < 0) {
                    questionNum = questionNum*(-1);
                    probables = adivinar();
                    res.redirect ('/adivinar');
                    return;
                }
            } else {
                questionNum = viento (questionNum, req.query.response);
                if (questionNum < 0) {
                    questionNum = questionNum*(-1);
                    probables = adivinar();
                    res.redirect ('/adivinar');
                    return;
                }
            }
            res.redirect('/pregunta');
        } 
        else {
            probables = adivinar();
            res.redirect ('/adivinar');
        }
    }
})

app.get('/registro', (req,res)=>{
    res.render ('registro');
})

app.get('/fin', (req,res)=>{
    res.render ('fin');
})

app.get('/adivinar', (req,res)=>{
    preg_preg += 1;
    res.render ('adivinar', {id:preg_preg, instrumento:adivinado()});
})

app.listen (2617, () => {
    console.log ("App is running in port 2617");
});

function adivinar () {
    let similares = [];
    let posibles = [];
    let encontrado = {};
    let buscado = Object.assign(ignoto);
    instrumentos.forEach(instAlmacenado => {
        let agregable = true;//Suponemos que nos encontramos al que buscamos desde un inicio
        let similar = false;//Esperamos encontrarnos uno igual, pero puede haber similares
        if (buscado.tipo_instru == instAlmacenado.tipo_instru) {
            for (i in buscado) {
                if (i != "tipo_instru" && agregable) {//Si es tipo_instru se salta el paso
                    if (instAlmacenado[i] == undefined) {//Si el instrumento tiene ese característica
                        similar = true;
                    } else {
                        if ((instAlmacenado[i] !=  buscado[i])) {//Si tienen propiedades distintas, no es agregable
                            agregable = false;
                        }
                    }
                }
            }
            if (agregable && similar) {
                similares.push(Object.assign({},instAlmacenado));
            }
            if (agregable && !similar) {
                encontrado = Object.assign({},instAlmacenado);
            }
        }
    });

    if (JSON.stringify(encontrado) == "{}") {//Si no encontramos uno identico
        return similares;
    } else {
        posibles = [];
        posibles.push(Object.assign({},encontrado));
    }
    return posibles;
}

function adivinado () {
    if (probables.length <= 0) {
        return "Lo siento, no sé cual es tu instrumento.";
    } else {
        return probables[0].nombre;
    }
}

function updateInstrumentos(clave){
    let cadena_ini = "let instrumentos = [";
    let cadena_fin = "}]; module.exports = instrumentos;";
    let instrus = JSON.stringify(instrumentos);
    instrus = instrus.substring(1,instrus.length-1);

    let newInstru = JSON.stringify(ignoto);
    newInstru = newInstru.substring(1,newInstru.length-1);
    const fs = require("fs");

    fs.writeFile("instrumentos.js", cadena_ini + instrus + ',{' + newInstru + ',"' + clave + '":true' + cadena_fin, (err) => {
    if (err) throw err;
    });
}

function newQuestion(type,idNewQ,newQ){
    if(type == "cuerda"){
        let cadena_ini = "let preguntasC = ";
        let cadena_fin = "; module.exports = preguntasC;";
        preguntasC[idNewQ] = newQ;
        let nuevaPC = JSON.stringify(preguntasC);
        const fs = require("fs");
        fs.writeFile("preguntasC.js", cadena_ini + nuevaPC + cadena_fin, (err) => {
            if (err) throw err;
        });
    }
    if(type == "percusion"){
        let cadena_ini = "let preguntasP = ";
        let cadena_fin = "; module.exports = preguntasP;";
        preguntasP[idNewQ] = newQ;
        let nuevaPP = JSON.stringify(preguntasP);
        const fs = require("fs");
        fs.writeFile("preguntasP.js", cadena_ini + nuevaPP + cadena_fin, (err) => {
            if (err) throw err;
        });
    } 
    if(type == "viento"){
        let cadena_ini = "let preguntasV = ";
        let cadena_fin = "; module.exports = preguntasV;";
        preguntasV[idNewQ] = newQ;
        let nuevaPV = JSON.stringify(preguntasV);
        const fs = require("fs");
        fs.writeFile("preguntasV.js", cadena_ini + nuevaPV + cadena_fin, (err) => {
            if (err) throw err;
        });
    } 
}

function newKey(type,idNewC,clave){// Agrega una nueva clave a la sección correspondiente en el archivo de claves 
    if(type == "cuerda"){
        claves[0][idNewC] = clave;
        let cadena_ini = "let claves = ";
        let cadena_fin = "; module.exports = claves;";
        let cad_clave = JSON.stringify(claves);
        const fs = require("fs");
            fs.writeFile("claves.js", cadena_ini + cad_clave + cadena_fin, (err) => {
            if (err) throw err;
        });
    }
    if(type == "percusion"){
        claves[1][idNewC] = clave;
        let cadena_ini = "let claves = ";
        let cadena_fin = "; module.exports = claves;";
        let cad_clave = JSON.stringify(claves);
        const fs = require("fs");
            fs.writeFile("claves.js", cadena_ini + cad_clave + cadena_fin, (err) => {
            if (err) throw err;
        });
    } 
    if(type == "viento"){
        claves[2][idNewC] = clave;
        let cadena_ini = "let claves = ";
        let cadena_fin = "; module.exports = claves;";
        let cad_clave = JSON.stringify(claves);
        const fs = require("fs");
            fs.writeFile("claves.js", cadena_ini + cad_clave + cadena_fin, (err) => {
            if (err) throw err;
        });
    }
}

function cuerda(questionNum, response) {
    if (questionNum == 1 && (response == undefined)) {
        current = preguntasC[1];
        return 1;
    }
    else{
        if(response == "true"){
            if(preguntasC[questionNum*2] != undefined){
                current = preguntasC[questionNum*2];//cargamos la siguiente pregunta
                keyS = claves[0][questionNum];
                ignoto[keyS] = true;//cargamos la respuesta a la pregunta anterior
                return questionNum*2;//retornamos el valor de la pregunta siguiente
            }else{
                keyS = claves[0][questionNum];
                ignoto[keyS] = true;//cargamos la respuesta a la pregunta anterior
                listo = true;
                return -questionNum*2;
            }
        }else{
            if(preguntasC[(questionNum*2)+1] != undefined){
                current = preguntasC[(questionNum*2)+1];//cargamos la siguiente pregunta
                keyS = claves[0][questionNum];
                ignoto[keyS] = false;//cargamos  la respuesta a la pregunta anterior
                return (questionNum*2)+1;
            }else{
                keyS = claves[0][questionNum];
                ignoto[keyS] = false;//cargamos  la respuesta a la pregunta anterior
                listo = true;
                return -((questionNum*2)+1);
            }
        }
    }
}

function percusion(questionNum, response) { 
    if (questionNum == 1 && (response == undefined)) {
        current = preguntasP[1];
        return 1;
    }
    else{
        if(response == "true"){
            if(preguntasP[questionNum*2] != undefined){
                current = preguntasP[questionNum*2];//cargamos la siguiente pregunta
                keyS = claves[1][questionNum];
                ignoto[keyS] = true;//cargamos la respuesta a la pregunta anterior
                return questionNum*2;//retornamos el valor de la pregunta siguiente
            }else{
                keyS = claves[1][questionNum];
                ignoto[keyS] = true;//cargamos la respuesta a la pregunta anterior
                listo = true;
                return -questionNum*2;
            }
        }else{
            if(preguntasP[(questionNum*2)+1] != undefined){
                current = preguntasP[(questionNum*2)+1];//cargamos la siguiente pregunta
                keyS = claves[1][questionNum];
                ignoto[keyS] = false;//cargamos  la respuesta a la pregunta anterior
                return (questionNum*2)+1;
            }else{
                keyS = claves[1][questionNum];
                ignoto[keyS] = false;//cargamos  la respuesta a la pregunta anterior
                listo = true;
                return -((questionNum*2)+1);
            }
        }
    }
}

function viento(questionNum, response) {
    if (questionNum == 1 && (response == undefined)) {
        current = preguntasV[1];
        return 1;
    }
    else{
        if(response == "true"){
            if(preguntasV[questionNum*2] != undefined){
                current = preguntasV[questionNum*2];//cargamos la siguiente pregunta
                keyS = claves[2][questionNum];
                ignoto[keyS] = true;//cargamos la respuesta a la pregunta anterior
                return questionNum*2;//retornamos el valor de la pregunta siguiente
            }else{
                keyS = claves[2][questionNum];
                ignoto[keyS] = true;//cargamos la respuesta a la pregunta anterior
                listo = true;
                return -questionNum*2;
            }
        }else{
            if(preguntasV[(questionNum*2)+1] != undefined){
                current = preguntasV[(questionNum*2)+1];//cargamos la siguiente pregunta
                keyS = claves[2][questionNum];
                ignoto[keyS] = false;//cargamos  la respuesta a la pregunta anterior
                return (questionNum*2)+1;
            }else{
                keyS = claves[2][questionNum];
                ignoto[keyS] = false;//cargamos  la respuesta a la pregunta anterior
                listo = true;
                return -((questionNum*2)+1);
            }
        }
    }
}