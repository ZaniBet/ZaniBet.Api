var cmd = require('node-cmd');
var moment = require('moment');

/*
* - Dump la datababase de produit dans le dossier db_backup
* - Restorer la bdd téléchargé sur le serveur local
*/

cmd.get(
     'mongodump -h  -d zanibet -u  -p  -o db_backup/zanibet-prod-'+ moment().format(""),
     function(err, data, stderr){
         console.log('the current working dir is : ',data)
     }
 );
