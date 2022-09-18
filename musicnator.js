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
let actualQ = 0;
let nodo = 1;
let key = 0;
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
    if(type=="cuerda"){
        idNewQ = preguntasC.length + 1;
        idNewC = claves[0].length;
    }
    if(type=="percusion"){
        idNewQ = preguntasP.length + 1;
        idNewC = claves[1].length;
    }
    if(type=="viento"){
        idNewQ = preguntasV.length + 1;
        idNewC = claves[2].length;
    }
    newQ = req.query.pregunta;
    newKey(type,idNewC,clave);
    newQuestion(type,idNewQ,newQ);
    update(clave);
    res.redirect ('/');
})

app.get('/process', (req,res)=>{
    if (req.query.tipoInstrumento != undefined) {
        ignoto.tipo_instru = req.query.tipoInstrumento;
        if (ignoto.tipo_instru == "cuerda") {
            cuerda (questionNum, undefined);
        } else if (ignoto.tipo_instru == "percusion") {
            percusion (questionNum, undefined);
        } else {
            viento (questionNum, undefined);
        }
        res.redirect('/pregunta');
    } else {
        if (!listo) {
            if (ignoto.tipo_instru == "cuerda") {
                questionNum = cuerda (questionNum, req.query.response);
                if (questionNum == -1) {
                    probables = adivinar();
                    res.redirect ('/adivinar');
                    return;
                }
            } else if (ignoto.tipo_instru == "percusion") {
                questionNum = percusion (questionNum, req.query.response);
                if (questionNum == -1) {
                    probables = adivinar();
                    res.redirect ('/adivinar');
                    return;
                }
            } else {
                questionNum = viento (questionNum, req.query.response);
                if (questionNum == -1) {
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
    let probables = [];
    instrumentos.forEach(element => {
        let found = true;
        for (i in ignoto) {
            if (found) {
                if (element[i] == undefined || (element[i] !=  ignoto[i])) {
                    found = false;
                }
            }
        }
        if (found) {
            probables.push(element);
        }
    });
    return probables;
}

function adivinado () {
    if (probables.length <= 0) {
        return "Lo siento, no sé cual es tu instrumento.";
    } else {
        return probables[0].nombre;
    }
}

function update(clave){
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
        preguntasC[idNewQ] = newQ;
        let cadena_ini = "let preguntasC = ";
        let cadena_fin = "; module.exports = preguntasC;";
        let nuevaPC = JSON.stringify(preguntasC);
        const fs = require("fs");
            fs.writeFile("preguntasC.js", cadena_ini + nuevaPC + cadena_fin, (err) => {
            if (err) throw err;
        });
    }
    if(type == "percusion"){
        preguntasP[idNewQ] = newQ;
        let cadena_ini = "let preguntasP = ";
        let cadena_fin = "; module.exports = preguntasP;";
        let nuevaPP = JSON.stringify(preguntasP);
        const fs = require("fs");
            fs.writeFile("preguntasP.js", cadena_ini + nuevaPP + cadena_fin, (err) => {
            if (err) throw err;
        });
    } 
    if(type == "viento"){
        preguntasV[idNewQ] = newQ;
        let cadena_ini = "let preguntasV = ";
        let cadena_fin = "; module.exports = preguntasV;";
        let nuevaPV = JSON.stringify(preguntasV);
        const fs = require("fs");
            fs.writeFile("preguntasV.js", cadena_ini + nuevaPV + cadena_fin, (err) => {
            if (err) throw err;
        });
    } 
}
///////////////////////////////
function newKey(type,idNewC,clave){
    if(type == "cuerda"){
        claves[0][idNewC+1] = clave;
        let cadena_ini = "let claves = ";
        let cadena_fin = "; module.exports = claves;";
        let cad_clave = JSON.stringify(claves);
        const fs = require("fs");
            fs.writeFile("claves.js", cadena_ini + cad_clave + cadena_fin, (err) => {
            if (err) throw err;
        });
    }
    if(type == "percusion"){
        claves[1][idNewC+1] = clave;
        let cadena_ini = "let claves = ";
        let cadena_fin = "; module.exports = claves;";
        let cad_clave = JSON.stringify(claves);
        const fs = require("fs");
            fs.writeFile("claves.js", cadena_ini + cad_clave + cadena_fin, (err) => {
            if (err) throw err;
        });
    } 
    if(type == "viento"){
        claves[2][idNewC+1] = clave;
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
                current = preguntasC[questionNum*2];
                keyS = claves[0][questionNum*2];
                ignoto[keyS] = true;
                return questionNum*2;
            }else{
                listo = true;
                return -1;
            }
        }else if (response == "false"){
            nodo=(questionNum*2)+1;
            if(nodo<=claves.length){
                current = preguntasC[nodo];
                keyS = claves[0][nodo];
                ignoto[keyS] = false;
                return nodo;
            }else{
                listo = true;
                return -1;
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
                current = preguntasP[questionNum*2];
                keyS = claves[0][questionNum*2];
                ignoto[keyS] = true;
                return questionNum*2;
            }else{
                listo = true;
                return -1;
            }
        }else if (response == "false"){
            nodo=(questionNum*2)+1;
            if(nodo<=claves.length){
                current = preguntasP[nodo];
                keyS = claves[0][nodo];
                ignoto[keyS] = false;
                return nodo;
            }else{
                listo = true;
                return -1;
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
                current = preguntasV[questionNum*2];
                keyS = claves[0][questionNum*2];
                ignoto[keyS] = true;
                return questionNum*2;
            }else{
                listo = true;
                return -1;
            }
        }else if (response == "false"){
            nodo=(questionNum*2)+1;
            if(nodo<=claves.length){
                current = preguntasV[nodo];
                keyS = claves[0][nodo];
                ignoto[keyS] = false;
                return nodo;
            }else{
                listo = true;
                return -1;
            }
        }
    }
}