const grupos_de_usuarios = require('../database/grupos_de_usuarios');

async function verificarPermInserir(req, res, next) {
    var grupoEncontrado = await grupos_de_usuarios.findOne({
        where: {id:req.session.grupo}
    })

    if(grupoEncontrado.inserir === 1){
        return next();
    }
    res.redirect('/admin');
};

module.exports = verificarPermInserir;