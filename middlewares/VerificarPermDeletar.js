const grupos_de_usuarios = require('../database/grupos_de_usuarios');

async function verificarPermDeletar(req, res, next) {
    var grupoEncontrado = await grupos_de_usuarios.findOne({
        where: {id:req.session.grupo}
    })

    if(grupoEncontrado.deletar === 1){
        return next();
    }
    res.redirect('/admin');
}

module.exports = verificarPermDeletar;