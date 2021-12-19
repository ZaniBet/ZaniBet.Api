var express = require('express');
var mongoose = require('mongoose');
var router = express.Router();
var passport = require('passport');
var moment = require('moment');
var requestify = require('requestify');
var mongojs = require('mongojs');
var async = require('async');

moment.locale('fr');

var Client = mongoose.model('Client');
var Competition = mongoose.model('Competition');
var Team = mongoose.model('Team');
var Fixture = mongoose.model('Fixture');
var GameTicket = mongoose.model('GameTicket');
var User = mongoose.model('User');
var Reward = mongoose.model('Reward');
var Help = mongoose.model('Help');

router.post('/help/install', function(req, res){

  var helpArr = [
    { lang: 'fr', priority: 1, icon: 'fa_ticket', subject: 'Ticket de jeu', caption: 'Informations sur les tickets', qa: [
{ question: "Combien de ticket sont disponibles chaque semaine ?", answer: "ZaniBet vous permet de remplir des grilles de pronostics pour chaque journée de match de différentes compétitions de football pro <b>(« Ticket Multi »)</b>.<br>\
Vous avez également la possibilité de donner vos pronostics pour chaque matchs prévus dans la journée <b>(« Ticket Simple »)</b>.<br>\
Parfois des tickets spéciaux sont ouvert pour des évènements particulier tel que des matchs de coupe du monde, championnat européen…<br><br>\
Actuellement ZaniBet vous proposes de <b>jouer plus de 30 000 tickets simples</b> et <b>2000 tickets multi par saison sportive</b> ! De quoi pouvoir accumuler <b>des millions de ZaniCoins et pour les plus chanceux des centaines d’euros</b> grâce aux cagnottes." },

{ question: "Quels sont les championnats de football disponible sur ZaniBet ?",  answer: "<p><b>Sur ZaniBet vous pourrez pronostiquer les matchs des compétitions suivantes :</b><br>\
<ul>\
<h2>Europe</h2>\
<li><b>France :</b> Ligue 1</li><br>\
<li><b>France :</b> Ligue 2</li><br>\
<li><b>France :</b> National</li><br>\
<li><b>Allemagne :</b> Bundesliga 1</li><br>\
<li><b>Allemagne :</b> Bundesliga 2</li><br>\
<li><b>Allemagne :</b> 3. Liga</li><br>\
<li><b>Angleterre :</b> Premier League</li><br>\
<li><b>Angleterre :</b> EFL Championship</li><br>\
<li><b>Angleterre :</b> League One</li><br>\
<li><b>Angleterre :</b> League Two</li><br>\
<li><b>Pays Bas :</b> Eredivisie</li><br>\
<li><b>Pays Bas :</b> Eerste Divisie</li><br>\
<li><b>Italie :</b> Serie A</li><br>\
<li><b>Italie :</b> Serie B</li><br>\
<li><b>Portugal :</b> Primeira Liga</li><br>\
<li><b>Portugal :</b> Segunda Liga</li><br>\
<li><b>Espagne :</b> La Liga</li><br>\
<li><b>Espagne :</b> La Liga 2</li><br>\
<li><b>Espagne :</b> Segunda B : Groupe 1</li><br>\
<li><b>Espagne :</b> Segunda B : Groupe 2</li><br>\
<li><b>Espagne :</b> Segunda B : Groupe 3</li><br>\
<li><b>Espagne :</b> Segunda B : Groupe 4</li><br>\
<li><b>Turquie :</b> Super Lig</li><br>\
<li><b>Belgique :</b> Pro League</li><br>\
<li><b>Écosse :</b> Premiership</li><br>\
<li><b>Écosse :</b> Championship</li><br>\
<li><b>Écosse :</b> League One</li><br>\
<li><b>Écosse :</b> League Two</li><br>\
<li><b>Danemark :</b> Super League</li><br>\
<li><b>Danemark :</b> First Division</li><br>\
<li><b>Grèce :</b> Super League</li><br>\
<li><b>Grèce :</b> Football League</li><br>\
<li><b>Suède :</b> Allsvenskan</li><br>\
<li><b>Suède :</b> Superettan</li><br>\
<li><b>Suisse :</b> Super League</li><br>\
<li><b>Suisse :</b> Challenge League</li><br>\
<li><b>Slovaquie :</b> Super Liga</li><br>\
<li><b>Slovaquie :</b> 2. Liga</li><br>\
<li><b>Suède :</b> Superettan</li><br>\
<li><b>Mecedoine :</b> MFL</li><br>\
<li><b>Norvège :</b> Eliteserien</li><br>\
<li><b>Finlande :</b> Veikkaysliiga</li><br>\
<li><b>Russie :</b> Premier League</li><br>\
<li><b>Albanie :</b> Superliga</li><br>\
<li><b>Croatie :</b> 1. HNL</li><br>\
<li><b>Pologne :</b> Ekstraklasa</li><br>\
<li><b>Pologne :</b> 1. Liga</li><br>\
<li><b>Malte :</b> Premier League</li><br>\
<li><b>Autriche :</b> Tipico Bundesliga</li><br>\
<li><b>Ukraine :</b> Premier League</li><br>\
<li><b>Israel :</b> Ligat ha'Al</li><br>\
<li><b>Israel :</b> Liga Leumit</li><br>\
<h2>Amérique du nord</h2>\
<li><b>USA :</b> Major League Soccer</li><br>\
<li><b>USA :</b> United Soccer League</li><br>\
<h2>Amérique du sud</h2>\
<li><b>Brésil :</b> Serie A</li><br>\
<li><b>Brésil :</b> Serie B</li><br>\
<li><b>Argentine :</b> Superliga</li><br>\
<li><b>Colombie :</b> Primera A - Apertura</li><br>\
<li><b>Colombie :</b> Primera A - Clausura</li><br>\
<li><b>Chilie :</b> Primera Division</li><br>\
<li><b>Chilie :</b> Primera B</li><br>\
<li><b>Mexique :</b> Liga MX</li><br>\
<h2>Asie</h2>\
<li><b>Chine :</b> Super League</li><br>\
<li><b>Chine :</b> China League</li><br>\
<li><b>Japon :</b> J League</li><br>\
<li><b>Japon :</b> J League 2</li><br>\
<li><b>Japon :</b> J League 3</li><br>\
<li><b>Arabie Saoudite :</b> Pro League</li><br>\
<li><b>Hong Kong :</b> Premier League</li><br>\
<li><b>Singapore :</b> S League</li><br>\
</ul>\
</p>" },

{ question: "À quoi servent les jetons ?",  answer: "Les « jetons » vous permettent de jouer des grilles de pronostique pour les matchs de la journée et les tickets de jeu spécial." },

{ question: "Comment obtenir des jetons ?",  answer: "Tous les jours <b>ZaniBet vous offre plusieurs jetons</b>, si il vous reste moins de 5 jetons. Vous avez également la possibilité d’obtenir des jetons supplémentaires :<br><br>\
-	En regardant une courte vidéo qui dure entre 15 et 30 secondes. Cette action n’est réalisable qu’une fois toutes les 3 heures.<br><br>\
-	<b>En réalisant une tâche proposée par nos partenaires (sondage, test de jeu...).</b> Le nombre de mission réalisable dépend de votre pays et peuvent consister à essayer une application gratuite où remplir un sondage.\
" },

{ question: "En combien de temps sont crédités mes jetons ?",  answer: "Si vous choisissez d’obtenir plus de jetons en regardant une vidéo, vos <b>jetons seront immédiatement crédités sur votre compte</b> à la fin de celle-ci. Dans le cas où <b>vous avez réalisé une tâche<b>, vos jetons seront crédités sur votre compte entre 45 minutes et 24 heures. Ce délai dépend du temps de validation de nos partenaires. Vos <b>jetons seront crédités dès que nous recevons une confirmation</b> de leur part." },

{ question: "Je n’ai pas reçu mes jetons alors que j'ai accompli une tâche, que faire ?",  answer: "Dans le cas où vous avez accompli la tâche proposée, en respectant scrupuleusement les prérequis demandés et que vous ne recevez pas vos jetons :<br>\
-	Il est possible de <b>suivre le status de toutes vos tâches en cours</b> depuis l’interface de nos partenaires (Adscend).<br>\
-	Vous pouvez effectuer une réclamation pour la tâche qui ne vous a pas été crédité.<br><br>\
<b>Pour garantir toutes vos chances de recevoir vos jetons, veuillez vous assurez que :</b><br>\
-	Toutes les actions demandées pour compléter l’offre doivent être réalisées. Désinstaller trop rapidement l’application où ne pas remplir correctement un sondage, provoquera l’impossibilité de valider l’offre.<br>\
-	Si vous avez déjà réalisé l’offre une première fois, ou que vous avez déjà réalisé l’offre par l’intermédiaire d’une autre application, vous ne pourrez pas recevoir vos jetons.<br>\
-	Il est <b>FORTEMENT recommandé de compléter une offre en utilisant une connexion Wifi stable</b> pour éviter tout problème de communication.<br>\
-	L’utilisation de proxy, émulateur, VPN où tout autres dispositifs visant camoufler votre identité, empêchera la validation de l’offre.<br><br>\
Si malgré toutes ces précautions, vous ne recevez pas vos jetons, n’hésitez pas à faire une réclamation !" }
    ] },

    { lang: 'fr', priority: 2, icon: 'md_grid_on', subject: 'Grilles', caption: 'Fonctionnement des grilles de paris', qa: [
{ question: 'Existe-il une limite de grille jouable ?', answer: 'Chaque ticket de jeu possède un nombre de grille maximum jouables. Un indicateur du nombre de grilles jouées et jouables est visible sur chaque ticket de jeu.' },

{ question: "Pourquoi ais je toujours des grilles en attente, alors que les matchs sont terminés ?",  answer: "Pas d’inquiétude ! ZaniBet est une application jeune avec de nombreux algorithmes de traitement automatique. Cependant nous pouvons être amenés à vérifier manuellement tous les résultats, afin de garantir que vos pronostiques soient correctement pris en compte." },

{ question: 'Je n’arrive pas à valider ma grille, comment faire ?', answer: "Dans <b>le cas où vous n’arrivez pas à valider une grille multi</b>, cela peut être due à plusieurs raisons dont :<br><br>\
-	Vous avez atteint la limite de 8 grilles validables par heure.<br>\
-	Il n’y a aucune vidéo disponible pour votre localisation.<br>\
-	Votre connexion interne est instable, n’hésitez pas à réessayer avec une connexion wifi.<br><br>\
<b>Dans le cas où vous n’arrivez pas à valider une grille simple :</b><br><br>\
-	Vérifiez que vous avez suffisamment de jeton.<br>\
-	Vérifiez que le match que vous essayez de pronostiquer n’a pas déjà commencé." },

{ question: 'Je n’ai pas reçu l’intégralité de ma récompense pour une grille !', answer: "Si vous estimez ne pas avoir reçu le bon nombre de ZaniCoins par rapport aux pronostics que vous avez joués. Contactez le support avec la référence de votre grille à l’adresse : <b>help@zanibet.com</b>" }

    ] },

    { lang: 'fr', priority: 3, icon: 'fa_money', subject: 'Paiement', caption: 'Gains des grilles et boutique', qa: [
{ question: 'Comment recevoir mes gains ?', answer: 'Pour recevoir vos gains, vous devez compléter avec précision tous les champs de la page « Informations de paiement », accessible depuis le menu « Mon profil ». Tous les paiements sont effectuées avec PayPal sous un délai de 30 jours.' },
{ question: "Je n’ai pas encore reçu mes gains, que faire ?", answer: "Dans le cas où vous n’auriez pas reçu les gains de vos grilles/achat boutique sous 30 jours :\n-	Vérifier que vous avez correctement complété vos informations de paiement depuis votre profil.\n- Vérifier le dossier spam de vos emails, afin d’être sure de ne pas avoir été contacté par le service client de ZaniBet.\nN’hésitez pas à contacter le service client à l’adresse suivante : contact@zanibet.com en cas de problème !" }
    ] },

    { lang: 'fr', priority: 4, icon: 'fa_money', subject: 'Partenariat', caption: 'Générer un revenu complémentaire et récurrent', qa: [

{ question: 'Devenir un ambassadeur privilégié de ZaniBet', answer: 'Vous êtes YouTubeur, blogueur, influenceur où souhaitez simplement vous investir activement pour aider au développement de ZaniBet ? Nous avons la possibilité de vous proposer <b>un partenariat durable et lucratif !<b><br><br><b>N’hésitez pas à contacter notre service client</b> à l’adresse contact@zanibet.com, pour en discuter.' },

    ] },

    { lang: 'fr', priority: 5, icon: 'fa_exclamation_circle', subject: 'Réclamation & Assistance', caption: 'Comment faire une réclamation', qa: [

{ question: 'J’ai complété une mission Adscend mais je n’ai pas reçu mes jetons :', answer: 'J’ai complété une mission Adscend mais je n’ai pas reçu mes jetons :Dans le cas ou vous avez correctement effectué toutes les actions requises (essayer une application et la conserver un certain temps) et que vous n’avez pas reçu vos jetons après 24 heures, vous pouvez effectuer une réclamation. Pour cela vous devez :<br><br>1 - Vous rendre sur l’écran proposant les missions Adscend.<br>2 - Cliquer sur le <b>bouton « Hamburger » à droite de la barre de la navigation</b>.<br>3 - Sélectionner l’onglet <b>« Offer History »</b>.<br>4 - Cliquez sur le bouton <b>« Missing Points »</b> pour effectuer une réclamation auprès de notre partenaire, pour la mission qui n’a pas été validée.<br>5 - Une réponse vous sera apporté sous 5 jours ouvrés.' },

{ question: "J’ai effectué une demande de paiement dans la boutique, mais je n’ai pas reçu mon paiement :", answer: "Si au bout de 7 jours ouvrés, vous n’avez pas reçu le paiement d’une récompense dans la boutique, merci de :<br><br>1 - Vérifier que vous avez fourni des informations de paiement valide depuis votre « Profil ».<br>2 - Vérifier l’adresse PayPal indiquée peut recevoir des paiements.<br>3 - Vérifier que l’adresse email de votre compte est à jour pour recevoir vos chèques cadeaux Amazon.<br><br><b>Attention : Le multi compte (plusieurs comptes pour un même utilisateur), l’utilisation de VPN, proxy ou tous autres systèmes destinés à masquer votre identité/tricher est INTERDITE ! Les utilisateurs utilisant ce type de dispositif ne recevront pas leurs gains.</b><br><br>Si malgré cela votre paiement n’a toujours pas été effectué, <b>vous pouvez joindre le support à l’adresse contact@zanibet.com</b>" },

{ question: "J’ai remporté une partie de la cagnotte avec une grille multi sans faute, mais je n’ai pas reçu mon paiement :", answer: "Si au bout de 30 jours ouvrés, vous n’avez pas reçu le paiement d’une récompense pour une grille gagnante :<br><br>1 - Vérifier que vous avez fourni des informations de paiement valide depuis votre « Profil ».<br>2 - Vérifier l’adresse PayPal indiquée peut recevoir des paiements.<br><br><b>Attention : Le multi compte (plusieurs comptes pour un même utilisateur), l’utilisation de VPN, proxy ou tous autres systèmes destinés à masquer votre identité/tricher est INTERDITE ! Les utilisateurs utilisant ce type de dispositif ne recevrons pas leurs gains.</b><br><br>Si malgré cela votre paiement n’a toujours pas été effectué, <b>vous pouvez joindre le support à l’adresse contact@zanibet.com</b>" }

    ] },

    { lang: 'fr', priority: 6, icon: 'fa_building', subject: 'Conditions d\'utilisation', caption: '', qa: [
{ question: 'CGU - Mise à jour le 8 Mars 2018', answer: '<h1># Conditions générales d’utilisation de l’application ZaniBet</h1>\
<p>Ces conditions générales d’utilisation s’appliquent à toute personne (ci-après dénommée « Utilisateur », « Joueur ») qui installe et utilise l’application ZaniBet (ci-après dénommée « Application », « App », « Jeu »).<br>\
L’application ZaniBet est édité et géré par la société Devolios (ci-après dénommée « Éditeur»). Vous pouvez en savoir plus sur l’éditeur en consultant dans le kit de presse de l’application.</p>\
<h2>## 1. Inscription, prérequis d’utilisation, mot de passe</h2>\
<h3>## 1.1.</h3>\
<p>L’application peut être utilisée gratuitement après création d’un compte utilisateur. L’utilisateur peut s’inscrire en indiquant son adresse email ou en utilisant la solution d’authentification en un clic proposée par Facebook. <b>Vous pouvez vous inscrire si :</b><br>\
(a)	Vous avez 18 ans ou plus et possédez la majorité légale dans votre pays.<br>\
(b)	Vous certifiez que les informations indiquées lors de votre inscription sont valides et précises.<br>\
(c)	Vous ne possédez pas encore un compte sur l’Application.</p>\
<h3>## 1.2.</h3>\
<p>En complétant le formulaire d’inscription ou en utilisant Facebook Login, l’utilisateur enregistre un compte utilisateur ZaniBet, pour lui. Lorsque l’Éditeur confirme l’inscription, l’utilisateur aura accès à tous les services et fonctionnalités proposés par l’Application.</p>\
<h3>## 1.3.</h3>\
<p>La création d’un compte utilisateur est destinée à un usage privé et est obligatoire pour accéder au service de l’Application. L’Utilisateur doit fournir des informations complètes et justes. Un seul compte peut être créé par Utilisateur. Transférer ou vendre un compte à une autre partie est totalement INTERDIT. Le nom d’utilisateur utilisé ne doit pas violer les intérêts d’autrui ou enfreindre une loi.</p>\
<h3>## 1.4.</h3>\
<p>Lors de l’inscription, le mot de passe indiqué par l’utilisateur sera assigné à son compte. Si l’inscription se fait avec Facebook, l’utilisateur peut définir un mot de passe depuis son profil dans l’Application. L’Utilisateur ne doit en aucun communiquer son mot de passe à autrui. Dans le cas d’une perte de mot de passe, l’Utilisateur doit informer le support immédiatement.</p>\
<h2>## 2. Suppression du compte</h2>\
<h3>## 2.1</h3>\
<p>L’Utilisateur peut demander la suppression de son compte à n’importe quel moment, en envoyant un email au support de l’application à cette adresse : contact@zanibet.com</p>\
<h2>## 3. Spécifications générales</h2>\
<p>ZaniBet est un jeu de simulation de pronostic sportif pour les matchs de football. L’Utilisateur à la possibilité de remplir des grilles de jeu où il doit prédire le résultat d’une série de matchs. Dans le cas où l’Utilisateur valide une grille ou tous les résultats sont corrects, l’Utilisateur remporte une partie de la cagnotte indiquée sur son compte PayPal. L’utilisateur a également la possibilité de pronostiquer les évènements des matchs devant avoir lieu dans les 48 heures pour les compétitions actives, en utilisant des jetons.<br>\
Chaque fois qu’un Utilisateur pronostique un bon résultat, il accumule des ZaniCoins.</p>\
<h2>## 4. Collecter des ZaniCoins</h2>\
<h3>## 4.1.</h3>\
<p>L’Application offre la possibilité aux utilisateurs d’accumuler des points de fidélités (ci-après dénommée « ZaniCoins ») :<br>\
-	lors de la création d’un compte pour la première fois<br>\
-	en réalisant des pronostics gagnants</p>\
<h2>## 5. Echanger ses ZaniCoins et recevoir des récompenses</h2>\
<h3>## 5.1.</h3>\
<p>Les Utilisateurs peuvent échanger leurs ZaniCoins contre la récompense de leur choix à un taux défini par l’Éditeur. Les récompenses peuvent être par exemple des crédits PayPal, des cartes cadeaux Amazon ou tout autre récompense virtuelle pour un autre service. L’Utilisateur peut sélectionner la récompense de son choix depuis la section « Boutique » de l’Application. L’Utilisateur peut choisir n’importe quelle récompense proposée par l’Éditeur à condition d’avoir suffisamment de ZaniCoins.</p>\
<h3>## 5.2.</h3>\
<p>L’Éditeur transfèrera les gains en cash directement sur le compte PayPal de l’Utilisateur. Pour recevoir ses gains, l’Utilisateur doit obligatoirement compléter ses informations de paiement.</p>\
<h3>## 5.3.</h3>\
<p>Lors de l’échange des ZaniCoins contre une récompense, le taux de change au moment de l’échange est toujours appliqué. L’Éditeur se réserve le droit de modifier ou d’ajuster le taux de change suivant le cours des évènements.</p>\
<h2>## 6. Garantie d’un jeu loyal</h2>\
<h3>## 6.1.</h3>\
<p>L’Utilisateur n’a le droit de créer qu’un seul et unique compte pour l’Application. Le « multi-compte » est formellement interdit ! Si notre système de sécurité détecte plusieurs comptes appartenant à la même personne, l’Éditeur se réserve le droit de bannir tous les comptes fautifs.</p>\
<h3>## 6.2.</h3>\
<p>L’utilisation de programmes destinés à manipuler et truquer les résultats où le nombres de grilles validables est prohibée. Si un Utilisateur est surpris à tenter d’exploiter une faille, bug, ou tout autre avantage déloyal, son compte sera suspendu.</p><br>\
Mise à jour de 8 Mars 2018' }
    ] },

    { lang: 'fr', priority: 7, icon: 'fa_user_secret', subject: 'Politique de confidentialité', caption: '', qa: [
{ question: 'Confidentialité - Mise à jour le 8 Mars 2018', answer: '<h2>ARTICLE 1 – RENSEIGNEMENTS PERSONNELS RECUEILLIS</h2>\
<p>Lorsque vous effectuez un achat sur notre boutique, dans le cadre de notre processus d’achat et de vente, nous recueillons les renseignements personnels que vous nous fournissez, tels que votre nom, votre adresse et votre adresse e-mail. Lorsque vous naviguez sur notre boutique, nous recevons également automatiquement l’adresse de protocole Internet (adresse IP) de votre ordinateur, qui nous permet d’obtenir plus de détails au sujet du navigateur et du système d’exploitation que vous utilisez. Marketing par e-mail (le cas échéant): Avec votre permission, nous pourrions vous envoyer des e-mails au sujet de notre boutique, de nouveaux produits et d’autres mises à jour.</p>\
<h2>ARTICLE 2 - CONSENTEMENT</h2>\
<p>Comment obtenez-vous mon consentement? Lorsque vous nous fournissez vos renseignements personnels pour conclure une transaction, vérifier votre carte de crédit, passer une commande, planifier une livraison ou retourner un achat, nous présumons que vous consentez à ce que nous recueillions vos renseignements et à ce que nous les utilisions à cette fin uniquement. Si nous vous demandons de nous fournir vos renseignements personnels pour une autre raison, à des fins de marketing par exemple, nous vous demanderons directement votre consentement explicite, ou nous vous donnerons la possibilité de refuser. Comment puis-je retirer mon consentement? Si après nous avoir donné votre consentement, vous changez d’avis et ne consentez plus à ce que nous puissions vous contacter, recueillir vos renseignements ou les divulguer, vous pouvez nous en aviser en nous contactant à support@zanibet.com.</p>\
<h2>ARTICLE 3 – DIVULGATION</h2>\
<p>Nous pouvons divulguer vos renseignements personnels si la loi nous oblige à le faire ou si vous violez nos Conditions Générales de Vente et d’Utilisation.</p>\
<h2>ARTICLE 4 – SERVICES FOURNIS PAR DES TIERS</h2>\
<p>De manière générale, les fournisseurs tiers que nous utilisons vont uniquement recueillir, utiliser et divulguer vos renseignements dans la mesure du nécessaire pour pouvoir réaliser les services qu’ils nous fournissent. Cependant, certains tiers fournisseurs de services, comme les passerelles de paiement et autres processeurs de transactions de paiement, possèdent leurs propres politiques de confidentialité quant aux renseignements que nous sommes tenus de leur fournir pour vos transactions d’achat. En ce qui concerne ces fournisseurs, nous vous recommandons de lire attentivement leurs politiques de confidentialité pour que vous puissiez comprendre la manière dont ils traiteront vos renseignements personnels. Il ne faut pas oublier que certains fournisseurs peuvent être situés ou avoir des installations situées dans une juridiction différente de la vôtre ou de la nôtre. Donc si vous décidez de poursuivre une transaction qui requiert les services d’un fournisseur tiers, vos renseig\nements pourraient alors être régis par les lois de la juridiction dans laquelle ce fournisseur se situe ou celles de la juridiction dans laquelle ses installations sont situées. À titre d’exemple, si vous êtes situé au Canada et que votre transaction est traitée par une passerelle de paiement située aux États-Unis, les renseignements vous appartenant qui ont été utilisés pour conclure la transaction pourraient être divulgués en vertu de la législation des États-Unis, y compris le Patriot Act. Une fois que vous quittez le site de notre boutique ou que vous êtes redirigé vers le site web ou l’application d’un tiers, vous n’êtes plus régi par la présente Politique de Confidentialité ni par les Conditions Générales de Vente et d’Utilisation de notre site web. Liens Vous pourriez être amené à quitter notre site web en cliquant sur certains liens présents sur notre site. Nous n’assumons aucune responsabilité quant aux pratiques de confidentialité exercées par ces autres sites et vous recommandons de lire attentivement leurs politiques de confidentialité.</p>\
<h2>ARTICLE 5 – SÉCURITÉ</h2>\
<p>Pour protéger vos données personnelles, nous prenons des précautions raisonnables et suivons les meilleures pratiques de l’industrie pour nous assurer qu’elles ne soient pas perdues, détournées, consultées, divulguées, modifiées ou détruites de manière inappropriée. Si vous nous fournissez vos informations de carte de crédit, elles seront chiffrées par le biais de l’utilisation du protocole de sécurisation SSL et conservées avec un chiffrement de type AES-256. Bien qu’aucune méthode de transmission sur Internet ou de stockage électronique ne soit sûre à 100 %, nous suivons toutes les exigences de la norme PCI-DSS et mettons en œuvre des normes supplémentaires généralement reconnues par l’industrie.</p>\
<h2>ARTICLE 6 – ÂGE DE CONSENTEMENT</h2>\
<p>En utilisant ce site, vous déclarez que vous avez au moins l’âge de la majorité dans votre État ou province de résidence, et que vous nous avez donné votre consentement pour permettre à toute personne d’âge mineur à votre charge d’utiliser ce site web.</p>\
<h2>ARTICLE 7 – MODIFICATIONS APPORTÉES À LA PRÉSENTE POLITIQUE DE CONFIDENTIALITÉ</h2>\
<p>Nous nous réservons le droit de modifier la présente politique de confidentialité à tout moment, donc veuillez s’il vous plait la consulter fréquemment. Les changements et les clarifications prendront effet immédiatement après leur publication sur le site web. Si nous apportons des changements au contenu de cette politique, nous vous aviserons ici qu’elle a été mise à jour, pour que vous sachiez quels renseignements nous recueillons, la manière dont nous les utilisons, et dans quelles circonstances nous les divulguons, s’il y a lieu de le faire. Si notre boutique fait l’objet d’une acquisition par ou d’une fusion avec une autre entreprise, vos renseignements pourraient être transférés aux nouveaux propriétaires pour que nous puissions continuer à vous vendre des produits.</p>\
<h2>QUESTIONS ET COORDONNÉES</h2>\
<p>Si vous souhaitez: accéder à, corriger, modifier ou supprimer toute information personnelle que nous avons à votre sujet, déposer une plainte, ou si vous souhaitez simplement avoir plus d’informations, contactez notre agent responsable des normes de confidentialité à contact@zanibet.com</p>' },
    ] }
  ];

  var helpArrEn = [
    { lang: 'en', priority: 0, icon: 'fa_ticket', subject: 'Game Ticket', caption: 'More infos about game ticket', qa: [
{ question: "How many game tickets are available each week ?", answer: "With ZaniBet you can predict each league match day with the « MULTI » gameplay, and each match planned in the next 48 hours." },

{ question: "Which football leagues are available in ZaniBet ?",  answer: "<p><b>With ZaniBet app you can predict matches from :</b><br>\
<ul>\
<h2>Europe</h2>\
<li><b>France :</b> Ligue 1</li><br>\
<li><b>France :</b> Ligue 2</li><br>\
<li><b>Germany :</b> Bundesliga 1</li><br>\
<li><b>Germany :</b> Bundesliga 2</li><br>\
<li><b>Germany :</b> 3. Liga</li><br>\
<li><b>England :</b> Premier League</li><br>\
<li><b>England :</b> EFL Championship</li><br>\
<li><b>England :</b> League One</li><br>\
<li><b>Netherlands :</b> Eredivisie</li><br>\
<li><b>Netherlands :</b> Eerste Divisie</li><br>\
<li><b>Italia :</b> Serie A</li><br>\
<li><b>Portugal :</b> Primeira Liga</li><br>\
<li><b>Spain:</b> La Liga</li><br>\
<li><b>Spain:</b> La Liga 2</li><br>\
<li><b>Spain:</b> Segunda B : Group 1</li><br>\
<li><b>Spain:</b> Segunda B : Group 2</li><br>\
<li><b>Spain:</b> Segunda B : Group 3</li><br>\
<li><b>Spain:</b> Segunda B : Group 4</li><br>\
<li><b>Turkey:</b> Super Lig</li><br>\
<li><b>Belgium :</b> Pro League</li><br>\
<li><b>Scotland :</b> Scottish Premiership</li><br>\
<li><b>Danemark :</b> First Division</li><br>\
<li><b>Sweden :</b> Allsvenskan</li><br>\
<li><b>Sweden :</b> Superettan</li><br>\
<li><b>Norway :</b> Eliteserien</li><br>\
<li><b>Finlande :</b> Veikkaysliiga</li><br>\
<li><b>Russia :</b> Premier League</li><br>\
<li><b>Albania :</b> Superliga</li><br>\
<li><b>Croatia :</b> 1. HNL</li><br>\
<li><b>Poland :</b> Ekstraklasa</li><br>\
<li><b>Poland :</b> 1. Liga</li><br>\
<li><b>Malta :</b> Premier League</li><br>\
<li><b>Austria :</b> Tipico Bundesliga</li><br>\
<li><b>Ukraine :</b> Premier League</li><br>\
<li><b>Israel :</b> Ligat ha'Al</li><br>\
<li><b>Israel :</b> Liga Leumit</li><br>\
<h2>Nord America</h2>\
<li><b>USA :</b> Major League Soccer</li><br>\
<li><b>USA :</b> United Soccer League</li><br>\
<h2>South America</h2>\
<li><b>Brésil :</b> Serie A</li><br>\
<li><b>Brésil :</b> Serie B</li><br>\
<h2>Asia</h2>\
<li><b>Saoudi Arabi :</b> Pro League</li><br>\
<li><b>Hong Kong :</b> Premier League</li>\
</ul>\
</p>" },

{ question: "What can I do with chips ?",  answer: "With the chips you will be able to play grid on single match and special game tickets." },

{ question: "How can I get more chips ?",  answer: "Everyday ZaniBet offer you some chips if your balance is under 5 chips. <b>You have the ability to get more chips by :</b><br><br>\
-	Watching a short video from 15sec to 30sec. This action is available once every three hours.<br>\
-	Doing a task proposed by our partner, like trying an app or complete a survey." },

{ question: "I've attempted to do an offer, but didn’t receive my chips!",  answer: "Please note the following when troubleshooting offer completions:<br><br>\
-	You must navigate to the offer from within ZaniBet. Doing so externally will not result in a credit, even if all requirements are met.<br>\
-	All requirements for each offer must be met entirely. Premature uninstallation/cancellation will cause the offer to not credit properly.<br>\
-	If you have attempted the same offer before, whether it be within ZaniBet or another game/app/website, it will not credit a second time.<br>\
-	Complete the offer when you have a strong-stable WiFi to avoid any communication issues.<br><br>\
If you believe you have met all requirements for an offer, but it has still not awarded you any chips, please give it at least 24 hours for the reward to show up." },

{ question: "It’s been more than 24 hours and my offers say « Pending » / « Rejected » !",  answer: "Offers are credited based on approval by the 3rd party provider. While an offer is in the Pending phase, it may or may not be approved based on whether the provider indicates all requirements have been met.<br><br>\
As an example, if an offer is a 30 day trial, it may not credit for several days, or at all if it's canceled instantly.<br><br>\
If an offer has been marked as Rejected, it usually indicates that requirements were not met, or that a duplicate submission was detected. <br><br>\
After 24 hours if you feel that an offer should have credited you can contact Iron Source (SS) at:<br>\
supersonic-customersupport@ironsrc.com<br><br>\
or within the app by scrolling down the page to the Missing Chips link. They will expect proof of offer completion in the form of screenshots.<br><br>\
To access the ad provider's FAQ, click on the Missing Chips link at the bottom of the Wall and choose an unrewarded offer via the Missing Chips option." }
    ] },

    { lang: 'en', priority: 1, icon: 'md_grid_on', subject: 'Grids', caption: 'How game ticket grids work', qa: [
{ question: 'How many grid I can play per ticket ?', answer: 'Each ticket got a maximum play time limit. There is only exception with the « SIMPLE » game ticket, which allow you to play only one grid per ticket.' },
{ question: "Why some of my grids are still pending, while all matches ended ?",  answer: "Don’t worry ! Sometimes we need to proceed some matches score manually, so we are sure all your predictions are correctly treated." }
    ] },

    { lang: 'en', priority: 3, icon: 'fa_money', subject: 'Payment', caption: 'Reward from game ticket and shop', qa: [
{ question: 'How to receive my money ?', answer: 'To receive the money you earn from game ticket or cash reward from the shop, you must fill your personal data in the « Profile -> Payment Details ». All payments from game ticket earn are done in less than 14 days and shop reward is usually paid within 7 days.' },
{ question: "I didn’t receive my reward, what should I do ?", answer: "If you didn’t receive your reward until 30 days :<br>\
-	Check that you correctly fill all your payout details in the « Profile » section.<br>\
-	Check your spam folder to be sure you haven’t been contacted by the support.<br>\
<b>In another case feel free to contact our support at : contact@zanibet.com</b>" }
    ] },

    { lang: 'en', priority: 4, icon: 'fa_money', subject: 'Partnership', caption: 'Earn durable and addionnal income', qa: [

{ question: 'Become  special ZaniBet ambassador', answer: 'You\'re a Youtuber, blogger, influencer or simply want to be active in ZaniBet development ? We can offer you a <b>special partnership<b><br><br><b>Feel free to send us a mail</b> at l’adresse contact@zanibet.com, for talk about it.' },

    ] },

    { lang: 'en', priority: 5, icon: 'fa_exclamation_circle', subject: 'Réclamation & Assistance', caption: 'Comment faire une réclamation', qa: [

{ question: 'J’ai complété une mission Adscend mais je n’ai pas reçu mes jetons :', answer: 'J’ai complété une mission Adscend mais je n’ai pas reçu mes jetons :Dans le cas ou vous avez correctement effectué toutes les actions requises (essayer une application et la conserver un certain temps) et que vous n’avez pas reçu vos jetons après 24 heures, vous pouvez effectuer une réclamation. Pour cela vous devez :<br><br>1 - Vous rendre sur l’écran proposant les missions Adscend.<br>2 - Cliquer sur le <b>bouton « Hamburger » à droite de la barre de la navigation</b>.<br>3 - Sélectionner l’onglet <b>« Offer History »</b>.<br>4 - Cliquez sur le bouton <b>« Missing Points »</b> pour effectuer une réclamation auprès de notre partenaire, pour la mission qui n’a pas été validée.<br>5 - Une réponse vous sera apporté sous 5 jours ouvrés.' },


{ question: "J’ai effectué une demande de paiement dans la boutique, mais je n’ai pas reçu mon paiement :", answer: "Si au bout de 7 jours ouvrés, vous n’avez pas reçu le paiement d’une récompense dans la boutique, merci de :<br><br>1 - Vérifier que vous avez fourni des informations de paiement valide depuis votre « Profil ».<br>2 - Vérifier l’adresse PayPal indiquée peut recevoir des paiements.<br>3 - Vérifier que l’adresse email de votre compte est à jour pour recevoir vos chèques cadeaux Amazon.<br><br><b>Attention : Le multi compte (plusieurs comptes pour un même utilisateur), l’utilisation de VPN, proxy ou tous autres systèmes destinés à masquer votre identité/tricher est INTERDITE ! Les utilisateurs utilisant ce type de dispositif ne recevront pas leurs gains.</b><br><br>Si malgré cela votre paiement n’a toujours pas été effectué, <b>vous pouvez joindre le support à l’adresse contact@zanibet.com</b>" },

{ question: "J’ai remporté une partie de la cagnotte avec une grille multi sans faute, mais je n’ai pas reçu mon paiement :", answer: "Si au bout de 30 jours ouvrés, vous n’avez pas reçu le paiement d’une récompense pour une grille gagnante :<br><br>1 - Vérifier que vous avez fourni des informations de paiement valide depuis votre « Profil ».<br>2 - Vérifier l’adresse PayPal indiquée peut recevoir des paiements.<br><br><b>Attention : Le multi compte (plusieurs comptes pour un même utilisateur), l’utilisation de VPN, proxy ou tous autres systèmes destinés à masquer votre identité/tricher est INTERDITE ! Les utilisateurs utilisant ce type de dispositif ne recevrons pas leurs gains.</b>Si malgré cela votre paiement n’a toujours pas été effectué, <b>vous pouvez joindre le support à l’adresse contact@zanibet.com</b>" }

    ] },

    { lang: 'en', priority: 6, icon: 'fa_building', subject: 'Terms of service', caption: '', qa: [
{ question: 'TOS - Updated at 8 March 2018', answer: '<h1># Conditions générales d’utilisation de l’application ZaniBet</h1>\
<p>Ces conditions générales d’utilisation s’appliquent à toute personne (ci-après dénommée « Utilisateur », « Joueur ») qui installe et utilise l’application ZaniBet (ci-après dénommée « Application », « App », « Jeu »).<br>\
L’application ZaniBet est édité et géré par la société Devolios (ci-après dénommée « Éditeur»). Vous pouvez en savoir plus sur l’éditeur en consultant dans le kit de presse de l’application.</p>\
<h2>## 1. Inscription, prérequis d’utilisation, mot de passe</h2>\
<h3>## 1.1.</h3>\
<p>L’application peut être utilisée gratuitement après création d’un compte utilisateur. L’utilisateur peut s’inscrire en indiquant son adresse email ou en utilisant la solution d’authentification en un clic proposée par Facebook. <b>Vous pouvez vous inscrire si :</b><br>\
(a)	Vous avez 18 ans ou plus et possédez la majorité légale dans votre pays.<br>\
(b)	Vous certifiez que les informations indiquées lors de votre inscription sont valides et précises.<br>\
(c)	Vous ne possédez pas encore un compte sur l’Application.</p>\
<h3>## 1.2.</h3>\
<p>En complétant le formulaire d’inscription ou en utilisant Facebook Login, l’utilisateur enregistre un compte utilisateur ZaniBet, pour lui. Lorsque l’Éditeur confirme l’inscription, l’utilisateur aura accès à tous les services et fonctionnalités proposés par l’Application.</p>\
<h3>## 1.3.</h3>\
<p>La création d’un compte utilisateur est destinée à un usage privé et est obligatoire pour accéder au service de l’Application. L’Utilisateur doit fournir des informations complètes et justes. Un seul compte peut être créé par Utilisateur. Transférer ou vendre un compte à une autre partie est totalement INTERDIT. Le nom d’utilisateur utilisé ne doit pas violer les intérêts d’autrui ou enfreindre une loi.</p>\
<h3>## 1.4.</h3>\
<p>Lors de l’inscription, le mot de passe indiqué par l’utilisateur sera assigné à son compte. Si l’inscription se fait avec Facebook, l’utilisateur peut définir un mot de passe depuis son profil dans l’Application. L’Utilisateur ne doit en aucun communiquer son mot de passe à autrui. Dans le cas d’une perte de mot de passe, l’Utilisateur doit informer le support immédiatement.</p>\
<h2>## 2. Suppression du compte</h2>\
<h3>## 2.1</h3>\
<p>L’Utilisateur peut demander la suppression de son compte à n’importe quel moment, en envoyant un email au support de l’application à cette adresse : contact@zanibet.com</p>\
<h2>## 3. Spécifications générales</h2>\
<p>ZaniBet est un jeu de simulation de pronostic sportif pour les matchs de football. L’Utilisateur à la possibilité de remplir des grilles de jeu où il doit prédire le résultat d’une série de matchs. Dans le cas où l’Utilisateur valide une grille ou tous les résultats sont corrects, l’Utilisateur remporte une partie de la cagnotte indiquée sur son compte PayPal. L’utilisateur a également la possibilité de pronostiquer les évènements des matchs devant avoir lieu dans les 48 heures pour les compétitions actives, en utilisant des jetons.<br>\
Chaque fois qu’un Utilisateur pronostique un bon résultat, il accumule des ZaniCoins.</p>\
<h2>## 4. Collecter des ZaniCoins</h2>\
<h3>## 4.1.</h3>\
<p>L’Application offre la possibilité aux utilisateurs d’accumuler des points de fidélités (ci-après dénommée « ZaniCoins ») :<br>\
-	lors de la création d’un compte pour la première fois<br>\
-	en réalisant des pronostics gagnants</p>\
<h2>## 5. Echanger ses ZaniCoins et recevoir des récompenses</h2>\
<h3>## 5.1.</h3>\
<p>Les Utilisateurs peuvent échanger leurs ZaniCoins contre la récompense de leur choix à un taux défini par l’Éditeur. Les récompenses peuvent être par exemple des crédits PayPal, des cartes cadeaux Amazon ou tout autre récompense virtuelle pour un autre service. L’Utilisateur peut sélectionner la récompense de son choix depuis la section « Boutique » de l’Application. L’Utilisateur peut choisir n’importe quelle récompense proposée par l’Éditeur à condition d’avoir suffisamment de ZaniCoins.</p>\
<h3>## 5.2.</h3>\
<p>L’Éditeur transfèrera les gains en cash directement sur le compte PayPal de l’Utilisateur. Pour recevoir ses gains, l’Utilisateur doit obligatoirement compléter ses informations de paiement.</p>\
<h3>## 5.3.</h3>\
<p>Lors de l’échange des ZaniCoins contre une récompense, le taux de change au moment de l’échange est toujours appliqué. L’Éditeur se réserve le droit de modifier ou d’ajuster le taux de change suivant le cours des évènements.</p>\
<h2>## 6. Garantie d’un jeu loyal</h2>\
<h3>## 6.1.</h3>\
<p>L’Utilisateur n’a le droit de créer qu’un seul et unique compte pour l’Application. Le « multi-compte » est formellement interdit ! Si notre système de sécurité détecte plusieurs comptes appartenant à la même personne, l’Éditeur se réserve le droit de bannir tous les comptes fautifs.</p>\
<h3>## 6.2.</h3>\
<p>L’utilisation de programmes destinés à manipuler et truquer les résultats où le nombres de grilles validables est prohibée. Si un Utilisateur est surpris à tenter d’exploiter une faille, bug, ou tout autre avantage déloyal, son compte sera suspendu.</p><br>\
Mise à jour de 8 Mars 2018' }
    ] },

    { lang: 'en', priority: 7, icon: 'fa_user_secret', subject: 'Privacy', caption: '', qa: [
{ question: 'Privacy - Updated at 8 March 2018', answer: '<h2>ARTICLE 1 – RENSEIGNEMENTS PERSONNELS RECUEILLIS</h2>\
<p>Lorsque vous effectuez un achat sur notre boutique, dans le cadre de notre processus d’achat et de vente, nous recueillons les renseignements personnels que vous nous fournissez, tels que votre nom, votre adresse et votre adresse e-mail. Lorsque vous naviguez sur notre boutique, nous recevons également automatiquement l’adresse de protocole Internet (adresse IP) de votre ordinateur, qui nous permet d’obtenir plus de détails au sujet du navigateur et du système d’exploitation que vous utilisez. Marketing par e-mail (le cas échéant): Avec votre permission, nous pourrions vous envoyer des e-mails au sujet de notre boutique, de nouveaux produits et d’autres mises à jour.</p>\
<h2>ARTICLE 2 - CONSENTEMENT</h2>\
<p>Comment obtenez-vous mon consentement? Lorsque vous nous fournissez vos renseignements personnels pour conclure une transaction, vérifier votre carte de crédit, passer une commande, planifier une livraison ou retourner un achat, nous présumons que vous consentez à ce que nous recueillions vos renseignements et à ce que nous les utilisions à cette fin uniquement. Si nous vous demandons de nous fournir vos renseignements personnels pour une autre raison, à des fins de marketing par exemple, nous vous demanderons directement votre consentement explicite, ou nous vous donnerons la possibilité de refuser. Comment puis-je retirer mon consentement? Si après nous avoir donné votre consentement, vous changez d’avis et ne consentez plus à ce que nous puissions vous contacter, recueillir vos renseignements ou les divulguer, vous pouvez nous en aviser en nous contactant à support@zanibet.com.</p>\
<h2>ARTICLE 3 – DIVULGATION</h2>\
<p>Nous pouvons divulguer vos renseignements personnels si la loi nous oblige à le faire ou si vous violez nos Conditions Générales de Vente et d’Utilisation.</p>\
<h2>ARTICLE 4 – SERVICES FOURNIS PAR DES TIERS</h2>\
<p>De manière générale, les fournisseurs tiers que nous utilisons vont uniquement recueillir, utiliser et divulguer vos renseignements dans la mesure du nécessaire pour pouvoir réaliser les services qu’ils nous fournissent. Cependant, certains tiers fournisseurs de services, comme les passerelles de paiement et autres processeurs de transactions de paiement, possèdent leurs propres politiques de confidentialité quant aux renseignements que nous sommes tenus de leur fournir pour vos transactions d’achat. En ce qui concerne ces fournisseurs, nous vous recommandons de lire attentivement leurs politiques de confidentialité pour que vous puissiez comprendre la manière dont ils traiteront vos renseignements personnels. Il ne faut pas oublier que certains fournisseurs peuvent être situés ou avoir des installations situées dans une juridiction différente de la vôtre ou de la nôtre. Donc si vous décidez de poursuivre une transaction qui requiert les services d’un fournisseur tiers, vos renseig\nements pourraient alors être régis par les lois de la juridiction dans laquelle ce fournisseur se situe ou celles de la juridiction dans laquelle ses installations sont situées. À titre d’exemple, si vous êtes situé au Canada et que votre transaction est traitée par une passerelle de paiement située aux États-Unis, les renseignements vous appartenant qui ont été utilisés pour conclure la transaction pourraient être divulgués en vertu de la législation des États-Unis, y compris le Patriot Act. Une fois que vous quittez le site de notre boutique ou que vous êtes redirigé vers le site web ou l’application d’un tiers, vous n’êtes plus régi par la présente Politique de Confidentialité ni par les Conditions Générales de Vente et d’Utilisation de notre site web. Liens Vous pourriez être amené à quitter notre site web en cliquant sur certains liens présents sur notre site. Nous n’assumons aucune responsabilité quant aux pratiques de confidentialité exercées par ces autres sites et vous recommandons de lire attentivement leurs politiques de confidentialité.</p>\
<h2>ARTICLE 5 – SÉCURITÉ</h2>\
<p>Pour protéger vos données personnelles, nous prenons des précautions raisonnables et suivons les meilleures pratiques de l’industrie pour nous assurer qu’elles ne soient pas perdues, détournées, consultées, divulguées, modifiées ou détruites de manière inappropriée. Si vous nous fournissez vos informations de carte de crédit, elles seront chiffrées par le biais de l’utilisation du protocole de sécurisation SSL et conservées avec un chiffrement de type AES-256. Bien qu’aucune méthode de transmission sur Internet ou de stockage électronique ne soit sûre à 100 %, nous suivons toutes les exigences de la norme PCI-DSS et mettons en œuvre des normes supplémentaires généralement reconnues par l’industrie.</p>\
<h2>ARTICLE 6 – ÂGE DE CONSENTEMENT</h2>\
<p>En utilisant ce site, vous déclarez que vous avez au moins l’âge de la majorité dans votre État ou province de résidence, et que vous nous avez donné votre consentement pour permettre à toute personne d’âge mineur à votre charge d’utiliser ce site web.</p>\
<h2>ARTICLE 7 – MODIFICATIONS APPORTÉES À LA PRÉSENTE POLITIQUE DE CONFIDENTIALITÉ</h2>\
<p>Nous nous réservons le droit de modifier la présente politique de confidentialité à tout moment, donc veuillez s’il vous plait la consulter fréquemment. Les changements et les clarifications prendront effet immédiatement après leur publication sur le site web. Si nous apportons des changements au contenu de cette politique, nous vous aviserons ici qu’elle a été mise à jour, pour que vous sachiez quels renseignements nous recueillons, la manière dont nous les utilisons, et dans quelles circonstances nous les divulguons, s’il y a lieu de le faire. Si notre boutique fait l’objet d’une acquisition par ou d’une fusion avec une autre entreprise, vos renseignements pourraient être transférés aux nouveaux propriétaires pour que nous puissions continuer à vous vendre des produits.</p>\
<h2>QUESTIONS ET COORDONNÉES</h2>\
<p>Si vous souhaitez: accéder à, corriger, modifier ou supprimer toute information personnelle que nous avons à votre sujet, déposer une plainte, ou si vous souhaitez simplement avoir plus d’informations, contactez notre agent responsable des normes de confidentialité à contact@zanibet.com</p>' },
    ] }
  ];

  var helpArrPt = [
    { lang: 'pt', priority: 1, icon: 'fa_ticket', subject: 'Ingresso do jogo', caption: 'Informação do ingresso do jogo', qa: [
{ question: "Quantos ingressos estão disponíveis a cada semana?", answer: "ZaniBet permite que você preencha grades de previsão para cada jornada de diferentes competições de futebol profissional<b> (Ingresso « Multi »)</b>.<br>\
Você também tem a oportunidade de dar suas previsões para cada partida programada para o dia<b> (Ingresso « Simple »)</b>.<br>\
Às vezes, ingressos especiais estão abertos para eventos especiais, como jogos da Copa do Mundo, Campeonato Europeu…<br><br>\
Atualmente, o ZaniBet oferece-lhe mais de 30.000 bilhetes individuais e 1000 multibalks por época desportiva! O suficiente para acumular milhões de ZaniCoins e para os sortudos centenas de euros graças aos gatinhos." },

{ question: "Quais campeonatos de futebol estão disponíveis no ZaniBet ?",  answer: "<p><b>No ZaniBet você pode prever as partidas das seguintes competições :</b><br>\
<ul>\
<h2>Europe</h2>\
<li><b>France :</b> Ligue 1</li><br>\
<li><b>France :</b> Ligue 2</li><br>\
<li><b>France :</b> National</li><br>\
<li><b>Allemagne :</b> Bundesliga 1</li><br>\
<li><b>Allemagne :</b> Bundesliga 2</li><br>\
<li><b>Allemagne :</b> 3. Liga</li><br>\
<li><b>Angleterre :</b> Premier League</li><br>\
<li><b>Angleterre :</b> EFL Championship</li><br>\
<li><b>Angleterre :</b> League One</li><br>\
<li><b>Angleterre :</b> League Two</li><br>\
<li><b>Pays Bas :</b> Eredivisie</li><br>\
<li><b>Pays Bas :</b> Eerste Divisie</li><br>\
<li><b>Italie :</b> Serie A</li><br>\
<li><b>Italie :</b> Serie B</li><br>\
<li><b>Portugal :</b> Primeira Liga</li><br>\
<li><b>Portugal :</b> Segunda Liga</li><br>\
<li><b>Espagne :</b> La Liga</li><br>\
<li><b>Espagne :</b> La Liga 2</li><br>\
<li><b>Espagne :</b> Segunda B : Groupe 1</li><br>\
<li><b>Espagne :</b> Segunda B : Groupe 2</li><br>\
<li><b>Espagne :</b> Segunda B : Groupe 3</li><br>\
<li><b>Espagne :</b> Segunda B : Groupe 4</li><br>\
<li><b>Turquie :</b> Super Lig</li><br>\
<li><b>Belgique :</b> Pro League</li><br>\
<li><b>Écosse :</b> Premiership</li><br>\
<li><b>Écosse :</b> Championship</li><br>\
<li><b>Écosse :</b> League One</li><br>\
<li><b>Écosse :</b> League Two</li><br>\
<li><b>Danemark :</b> Super League</li><br>\
<li><b>Danemark :</b> First Division</li><br>\
<li><b>Grèce :</b> Super League</li><br>\
<li><b>Grèce :</b> Football League</li><br>\
<li><b>Suède :</b> Allsvenskan</li><br>\
<li><b>Suède :</b> Superettan</li><br>\
<li><b>Suisse :</b> Super League</li><br>\
<li><b>Suisse :</b> Challenge League</li><br>\
<li><b>Slovaquie :</b> Super Liga</li><br>\
<li><b>Slovaquie :</b> 2. Liga</li><br>\
<li><b>Suède :</b> Superettan</li><br>\
<li><b>Mecedoine :</b> MFL</li><br>\
<li><b>Norvège :</b> Eliteserien</li><br>\
<li><b>Finlande :</b> Veikkaysliiga</li><br>\
<li><b>Russie :</b> Premier League</li><br>\
<li><b>Albanie :</b> Superliga</li><br>\
<li><b>Croatie :</b> 1. HNL</li><br>\
<li><b>Pologne :</b> Ekstraklasa</li><br>\
<li><b>Pologne :</b> 1. Liga</li><br>\
<li><b>Malte :</b> Premier League</li><br>\
<li><b>Autriche :</b> Tipico Bundesliga</li><br>\
<li><b>Ukraine :</b> Premier League</li><br>\
<li><b>Israel :</b> Ligat ha'Al</li><br>\
<li><b>Israel :</b> Liga Leumit</li><br>\
<h2>Amérique du nord</h2>\
<li><b>USA :</b> Major League Soccer</li><br>\
<li><b>USA :</b> United Soccer League</li><br>\
<h2>Amérique du sud</h2>\
<li><b>Brésil :</b> Serie A</li><br>\
<li><b>Brésil :</b> Serie B</li><br>\
<li><b>Argentine :</b> Superliga</li><br>\
<li><b>Colombie :</b> Primera A - Apertura</li><br>\
<li><b>Colombie :</b> Primera A - Clausura</li><br>\
<li><b>Chilie :</b> Primera Division</li><br>\
<li><b>Chilie :</b> Primera B</li><br>\
<li><b>Mexique :</b> Liga MX</li><br>\
<h2>Asie</h2>\
<li><b>Chine :</b> Super League</li><br>\
<li><b>Chine :</b> China League</li><br>\
<li><b>Japon :</b> J League</li><br>\
<li><b>Japon :</b> J League 2</li><br>\
<li><b>Japon :</b> J League 3</li><br>\
<li><b>Arabie Saoudite :</b> Pro League</li><br>\
<li><b>Hong Kong :</b> Premier League</li><br>\
<li><b>Singapore :</b> S League</li><br>\
</ul>\
</p>" },

{ question: "Quais são os tokens ?",  answer: "Tokens permitem que você jogue grades de prognósticos para jogos diários e ingressos para jogos especiais." },

{ question: "Como conseguir fichas?",  answer: "Todos os dias, o ZaniBet oferece várias fichas, se você tiver menos de 5 fichas restantes. Você também tem a opção de receber fichas adicionais :<br><br>\
-	Assistindo a um pequeno vídeo que dura entre 15 e 30 segundos. Esta ação só é possível uma vez a cada 3 horas.<br><br>\
-	<b>Ao realizar uma tarefa proposta pelos nossos parceiros (pesquisa, teste de jogo ...).</b> O número de missões atribuíveis depende do seu país e pode consistir em tentar um aplicativo gratuito onde concluir uma pesquisa.\
" },

{ question: "Por quanto tempo minhas fichas são creditadas?",  answer: "Se você optar por receber mais fichas assistindo a um vídeo, suas fichas serão imediatamente creditadas em sua conta no final dela. No caso de você ter concluído uma tarefa, suas fichas serão creditadas em sua conta entre 45 minutos e 24 horas. Este tempo depende do tempo de validação de nossos parceiros. Suas fichas serão creditadas assim que recebermos a confirmação delas." },

{ question: "Eu não recebi minhas fichas enquanto fazia uma tarefa, o que fazer?",  answer: "No caso de você ter completado a tarefa proposta, respeitando escrupulosamente os pré-requisitos necessários e você não recebe suas fichas:<br>\
-	É possível acompanhar o status de todas as suas tarefas atuais a partir da interface de nossos parceiros (Adscend).<br>\
-	Você pode fazer uma reivindicação para a tarefa que não foi creditada a você.<br><br>\
<b>Para garantir suas chances de receber suas fichas, certifique-se de que :</b><br>\
-	Todas as ações solicitadas para concluir a oferta devem ser concluídas. Desinstalar o aplicativo muito rapidamente ou não concluir uma pesquisa corretamente tornará impossível validar a oferta.<br>\
-	Se você já tiver feito a oferta pela primeira vez ou já tiver feito a oferta por meio de outro aplicativo, não poderá receber seus fichas.<br>\
-	É altamente recomendável concluir uma oferta usando uma conexão Wi-Fi estável para evitar qualquer problema de comunicação..<br>\
-	O uso de proxy, emulador, VPN ou qualquer outro dispositivo para ocultar sua identidade, impedirá a validação da oferta.<br><br>\
Se apesar de todas estas precauções, você não receber suas fichas, não hesite em fazer uma reclamação!" }
    ] },

    { lang: 'pt', priority: 2, icon: 'md_grid_on', subject: 'Grades', caption: 'Como funcionam as grades de jogos', qa: [
{ question: 'Existe um limite de grade jogável?', answer: 'Cada tíquete do jogo tem um número máximo de grade jogável. Um indicador do número de grades jogadas e jogáveis ​​é visível em cada tíquete do jogo.' },

{ question: "Por que sempre tenho grades esperando enquanto os jogos acabam?",  answer: "Não se preocupe! ZaniBet é uma aplicação jovem com muitos algoritmos de processamento automático. No entanto, podemos ter que verificar manualmente todos os resultados para garantir que seu prognóstico seja corretamente considerado." },

{ question: 'Eu não posso validar minha grade, como posso fazer isso?', answer: "Caso você não consiga validar um multi-grid, isso pode ser devido a vários motivos, incluindo:<br><br>\
-	Você atingiu o limite de 8 grades válidas por hora.<br>\
-	Não há vídeos disponíveis para sua localização.<br>\
-	Sua conexão com a internet está instável, sinta-se à vontade para experimentar uma conexão wifi.<br><br>\
<b>Caso você não consiga validar uma grade simples :</b><br><br>\
-	Verifique se você tem fichas suficientes.<br>\
-	Verifique se a correspondência que você está tentando prever ainda não começou." },

{ question: 'Eu não recebi minha recompensa completa por uma grade !', answer: "Se você acha que não recebeu o número certo de ZaniCoins em comparação com as previsões que você jogou. Entre em contato com o suporte com sua referência de grade em: <b>help@zanibet.com</b>" }

    ] },

    { lang: 'pt', priority: 3, icon: 'fa_money', subject: 'Pagamento', caption: 'Ganhos e ganhos na loja', qa: [
{ question: 'Como receber meus ganhos?', answer: 'Para receber seus ganhos, você deve preencher todos os campos da página "Informações de pagamento", acessível no menu "Meu perfil". Todos os pagamentos são feitos com o PayPal no prazo de 30 dias.' },
{ question: "Ainda não recebi meus ganhos, o que posso fazer?", answer: "No caso de você não ter recebido os ganhos de sua compra de grids / shop dentro de 30 dias:\n- Verifique se você concluiu corretamente suas informações de pagamento no seu perfil.\n- Verifique a pasta de spam de seus e-mails, para ter certeza de que você não foi contatado pelo serviço de atendimento ao cliente da ZaniBet.\nNão hesite em contactar o serviço ao cliente no seguinte endereço: contact@zanibet.com em caso de problema!" }
    ] },

    { lang: 'pt', priority: 4, icon: 'fa_star', subject: 'Parceria', caption: 'Gerar renda complementar e recorrente', qa: [

{ question: 'Torne-se um embaixador privilegiado da ZaniBet', answer: 'Você é o YouTubeur, blogueiro, influenciador, onde você só quer investir ativamente para ajudar a desenvolver o ZaniBet? Temos a oportunidade de oferecer uma parceria sustentável e lucrativa !<br><br>Não hesite em entrar em contato com o nosso serviço ao cliente em contact@zanibet.com para discutir.' },

    ] },

    { lang: 'pt', priority: 5, icon: 'fa_exclamation_circle', subject: 'Reclamação e Assistência', caption: 'Como fazer uma reclamação', qa: [

{ question: 'Eu completei uma missão do Adscend mas não recebi meus fichas:', answer: 'Eu completei uma missão do Adscend mas não recebi meus tokens: Caso você tenha executado corretamente todas as ações necessárias (tente um aplicativo e mantenha-o por um tempo) e você não recebeu seus tokens depois de 24 horas você pode fazer uma reclamação. Para isso você deve:<br><br>1 - Vá para a tela Missões do Adscend.<br>2 - Clique no botão "Hamburger" no lado direito da barra de navegação.<br>3 - Selecione a guia "Histórico de ofertas".<br>4 - Clique no botão "Pontos em falta" para fazer uma reclamação com o nosso parceiro, para a missão que não foi validada.<br>5 - Você será respondido dentro de 5 dias úteis.' },

{ question: "Fiz uma solicitação de pagamento na loja, mas não recebi meu pagamento :", answer: "Se após 7 dias úteis você não tiver recebido o pagamento de uma recompensa na loja, obrigado por:<br><br>1 - Verifique se você forneceu informações de pagamento válidas do seu \"Perfil\".<br>2 - Verifique se o endereço do PayPal especificado pode receber pagamentos.<br>3 - Verifique se o endereço de e-mail da sua conta está atualizado para receber seus certificados de presentes da Amazon.<br><br><b>Aviso: A conta múltipla (várias contas para o mesmo usuário), o uso de VPN, proxy ou qualquer outro sistema projetado para ocultar sua identidade / fraude é PROIBIDO! Os usuários que usam esse tipo de dispositivo não receberão seus ganhos.</b><br><br>Se ainda assim o seu pagamento não tiver sido efetuado, você pode entrar em contato com o suporte em contact@zanibet.com" },

{ question: "Ganhei parte do total de prêmios com um multi-grid sem culpa, mas não recebi meu pagamento:", answer: "Se após 30 dias úteis você não receber o pagamento de uma recompensa por uma grade vencedora:<br><br>1 - Verifique se você forneceu informações de pagamento válidas no seu \"Perfil\".<br>2 - Verifique se o endereço do PayPal especificado pode receber pagamentos.<br><br><b>Aviso: A conta múltipla (várias contas para o mesmo usuário), o uso de VPN, proxy ou qualquer outro sistema projetado para ocultar sua identidade / fraude é PROIBIDO! Os usuários que usam esse tipo de dispositivo não receberão seus ganhos.</b><br><br>Se ainda assim o seu pagamento não tiver sido efetuado, você pode entrar em contato com o suporte em contact@zanibet.com" }

    ] },

    { lang: 'pt', priority: 6, icon: 'fa_building', subject: 'Termos de uso', caption: '', qa: [
{ question: 'CGU - Mise à jour le 8 Mars 2018', answer: '<h1># Conditions générales d’utilisation de l’application ZaniBet</h1>\
<p>Ces conditions générales d’utilisation s’appliquent à toute personne (ci-après dénommée « Utilisateur », « Joueur ») qui installe et utilise l’application ZaniBet (ci-après dénommée « Application », « App », « Jeu »).<br>\
L’application ZaniBet est édité et géré par la société Devolios (ci-après dénommée « Éditeur»). Vous pouvez en savoir plus sur l’éditeur en consultant dans le kit de presse de l’application.</p>\
<h2>## 1. Inscription, prérequis d’utilisation, mot de passe</h2>\
<h3>## 1.1.</h3>\
<p>L’application peut être utilisée gratuitement après création d’un compte utilisateur. L’utilisateur peut s’inscrire en indiquant son adresse email ou en utilisant la solution d’authentification en un clic proposée par Facebook. <b>Vous pouvez vous inscrire si :</b><br>\
(a)	Vous avez 18 ans ou plus et possédez la majorité légale dans votre pays.<br>\
(b)	Vous certifiez que les informations indiquées lors de votre inscription sont valides et précises.<br>\
(c)	Vous ne possédez pas encore un compte sur l’Application.</p>\
<h3>## 1.2.</h3>\
<p>En complétant le formulaire d’inscription ou en utilisant Facebook Login, l’utilisateur enregistre un compte utilisateur ZaniBet, pour lui. Lorsque l’Éditeur confirme l’inscription, l’utilisateur aura accès à tous les services et fonctionnalités proposés par l’Application.</p>\
<h3>## 1.3.</h3>\
<p>La création d’un compte utilisateur est destinée à un usage privé et est obligatoire pour accéder au service de l’Application. L’Utilisateur doit fournir des informations complètes et justes. Un seul compte peut être créé par Utilisateur. Transférer ou vendre un compte à une autre partie est totalement INTERDIT. Le nom d’utilisateur utilisé ne doit pas violer les intérêts d’autrui ou enfreindre une loi.</p>\
<h3>## 1.4.</h3>\
<p>Lors de l’inscription, le mot de passe indiqué par l’utilisateur sera assigné à son compte. Si l’inscription se fait avec Facebook, l’utilisateur peut définir un mot de passe depuis son profil dans l’Application. L’Utilisateur ne doit en aucun communiquer son mot de passe à autrui. Dans le cas d’une perte de mot de passe, l’Utilisateur doit informer le support immédiatement.</p>\
<h2>## 2. Suppression du compte</h2>\
<h3>## 2.1</h3>\
<p>L’Utilisateur peut demander la suppression de son compte à n’importe quel moment, en envoyant un email au support de l’application à cette adresse : contact@zanibet.com</p>\
<h2>## 3. Spécifications générales</h2>\
<p>ZaniBet est un jeu de simulation de pronostic sportif pour les matchs de football. L’Utilisateur à la possibilité de remplir des grilles de jeu où il doit prédire le résultat d’une série de matchs. Dans le cas où l’Utilisateur valide une grille ou tous les résultats sont corrects, l’Utilisateur remporte une partie de la cagnotte indiquée sur son compte PayPal. L’utilisateur a également la possibilité de pronostiquer les évènements des matchs devant avoir lieu dans les 48 heures pour les compétitions actives, en utilisant des jetons.<br>\
Chaque fois qu’un Utilisateur pronostique un bon résultat, il accumule des ZaniCoins.</p>\
<h2>## 4. Collecter des ZaniCoins</h2>\
<h3>## 4.1.</h3>\
<p>L’Application offre la possibilité aux utilisateurs d’accumuler des points de fidélités (ci-après dénommée « ZaniCoins ») :<br>\
-	lors de la création d’un compte pour la première fois<br>\
-	en réalisant des pronostics gagnants</p>\
<h2>## 5. Echanger ses ZaniCoins et recevoir des récompenses</h2>\
<h3>## 5.1.</h3>\
<p>Les Utilisateurs peuvent échanger leurs ZaniCoins contre la récompense de leur choix à un taux défini par l’Éditeur. Les récompenses peuvent être par exemple des crédits PayPal, des cartes cadeaux Amazon ou tout autre récompense virtuelle pour un autre service. L’Utilisateur peut sélectionner la récompense de son choix depuis la section « Boutique » de l’Application. L’Utilisateur peut choisir n’importe quelle récompense proposée par l’Éditeur à condition d’avoir suffisamment de ZaniCoins.</p>\
<h3>## 5.2.</h3>\
<p>L’Éditeur transfèrera les gains en cash directement sur le compte PayPal de l’Utilisateur. Pour recevoir ses gains, l’Utilisateur doit obligatoirement compléter ses informations de paiement.</p>\
<h3>## 5.3.</h3>\
<p>Lors de l’échange des ZaniCoins contre une récompense, le taux de change au moment de l’échange est toujours appliqué. L’Éditeur se réserve le droit de modifier ou d’ajuster le taux de change suivant le cours des évènements.</p>\
<h2>## 6. Garantie d’un jeu loyal</h2>\
<h3>## 6.1.</h3>\
<p>L’Utilisateur n’a le droit de créer qu’un seul et unique compte pour l’Application. Le « multi-compte » est formellement interdit ! Si notre système de sécurité détecte plusieurs comptes appartenant à la même personne, l’Éditeur se réserve le droit de bannir tous les comptes fautifs.</p>\
<h3>## 6.2.</h3>\
<p>L’utilisation de programmes destinés à manipuler et truquer les résultats où le nombres de grilles validables est prohibée. Si un Utilisateur est surpris à tenter d’exploiter une faille, bug, ou tout autre avantage déloyal, son compte sera suspendu.</p><br>\
Mise à jour de 8 Mars 2018' }
    ] },

    { lang: 'pt', priority: 7, icon: 'fa_user_secret', subject: 'Política de Privacidade', caption: '', qa: [
{ question: 'Confidentialité - Mise à jour le 8 Mars 2018', answer: '<h2>ARTICLE 1 – RENSEIGNEMENTS PERSONNELS RECUEILLIS</h2>\
<p>Lorsque vous effectuez un achat sur notre boutique, dans le cadre de notre processus d’achat et de vente, nous recueillons les renseignements personnels que vous nous fournissez, tels que votre nom, votre adresse et votre adresse e-mail. Lorsque vous naviguez sur notre boutique, nous recevons également automatiquement l’adresse de protocole Internet (adresse IP) de votre ordinateur, qui nous permet d’obtenir plus de détails au sujet du navigateur et du système d’exploitation que vous utilisez. Marketing par e-mail (le cas échéant): Avec votre permission, nous pourrions vous envoyer des e-mails au sujet de notre boutique, de nouveaux produits et d’autres mises à jour.</p>\
<h2>ARTICLE 2 - CONSENTEMENT</h2>\
<p>Comment obtenez-vous mon consentement? Lorsque vous nous fournissez vos renseignements personnels pour conclure une transaction, vérifier votre carte de crédit, passer une commande, planifier une livraison ou retourner un achat, nous présumons que vous consentez à ce que nous recueillions vos renseignements et à ce que nous les utilisions à cette fin uniquement. Si nous vous demandons de nous fournir vos renseignements personnels pour une autre raison, à des fins de marketing par exemple, nous vous demanderons directement votre consentement explicite, ou nous vous donnerons la possibilité de refuser. Comment puis-je retirer mon consentement? Si après nous avoir donné votre consentement, vous changez d’avis et ne consentez plus à ce que nous puissions vous contacter, recueillir vos renseignements ou les divulguer, vous pouvez nous en aviser en nous contactant à support@zanibet.com.</p>\
<h2>ARTICLE 3 – DIVULGATION</h2>\
<p>Nous pouvons divulguer vos renseignements personnels si la loi nous oblige à le faire ou si vous violez nos Conditions Générales de Vente et d’Utilisation.</p>\
<h2>ARTICLE 4 – SERVICES FOURNIS PAR DES TIERS</h2>\
<p>De manière générale, les fournisseurs tiers que nous utilisons vont uniquement recueillir, utiliser et divulguer vos renseignements dans la mesure du nécessaire pour pouvoir réaliser les services qu’ils nous fournissent. Cependant, certains tiers fournisseurs de services, comme les passerelles de paiement et autres processeurs de transactions de paiement, possèdent leurs propres politiques de confidentialité quant aux renseignements que nous sommes tenus de leur fournir pour vos transactions d’achat. En ce qui concerne ces fournisseurs, nous vous recommandons de lire attentivement leurs politiques de confidentialité pour que vous puissiez comprendre la manière dont ils traiteront vos renseignements personnels. Il ne faut pas oublier que certains fournisseurs peuvent être situés ou avoir des installations situées dans une juridiction différente de la vôtre ou de la nôtre. Donc si vous décidez de poursuivre une transaction qui requiert les services d’un fournisseur tiers, vos renseig\nements pourraient alors être régis par les lois de la juridiction dans laquelle ce fournisseur se situe ou celles de la juridiction dans laquelle ses installations sont situées. À titre d’exemple, si vous êtes situé au Canada et que votre transaction est traitée par une passerelle de paiement située aux États-Unis, les renseignements vous appartenant qui ont été utilisés pour conclure la transaction pourraient être divulgués en vertu de la législation des États-Unis, y compris le Patriot Act. Une fois que vous quittez le site de notre boutique ou que vous êtes redirigé vers le site web ou l’application d’un tiers, vous n’êtes plus régi par la présente Politique de Confidentialité ni par les Conditions Générales de Vente et d’Utilisation de notre site web. Liens Vous pourriez être amené à quitter notre site web en cliquant sur certains liens présents sur notre site. Nous n’assumons aucune responsabilité quant aux pratiques de confidentialité exercées par ces autres sites et vous recommandons de lire attentivement leurs politiques de confidentialité.</p>\
<h2>ARTICLE 5 – SÉCURITÉ</h2>\
<p>Pour protéger vos données personnelles, nous prenons des précautions raisonnables et suivons les meilleures pratiques de l’industrie pour nous assurer qu’elles ne soient pas perdues, détournées, consultées, divulguées, modifiées ou détruites de manière inappropriée. Si vous nous fournissez vos informations de carte de crédit, elles seront chiffrées par le biais de l’utilisation du protocole de sécurisation SSL et conservées avec un chiffrement de type AES-256. Bien qu’aucune méthode de transmission sur Internet ou de stockage électronique ne soit sûre à 100 %, nous suivons toutes les exigences de la norme PCI-DSS et mettons en œuvre des normes supplémentaires généralement reconnues par l’industrie.</p>\
<h2>ARTICLE 6 – ÂGE DE CONSENTEMENT</h2>\
<p>En utilisant ce site, vous déclarez que vous avez au moins l’âge de la majorité dans votre État ou province de résidence, et que vous nous avez donné votre consentement pour permettre à toute personne d’âge mineur à votre charge d’utiliser ce site web.</p>\
<h2>ARTICLE 7 – MODIFICATIONS APPORTÉES À LA PRÉSENTE POLITIQUE DE CONFIDENTIALITÉ</h2>\
<p>Nous nous réservons le droit de modifier la présente politique de confidentialité à tout moment, donc veuillez s’il vous plait la consulter fréquemment. Les changements et les clarifications prendront effet immédiatement après leur publication sur le site web. Si nous apportons des changements au contenu de cette politique, nous vous aviserons ici qu’elle a été mise à jour, pour que vous sachiez quels renseignements nous recueillons, la manière dont nous les utilisons, et dans quelles circonstances nous les divulguons, s’il y a lieu de le faire. Si notre boutique fait l’objet d’une acquisition par ou d’une fusion avec une autre entreprise, vos renseignements pourraient être transférés aux nouveaux propriétaires pour que nous puissions continuer à vous vendre des produits.</p>\
<h2>QUESTIONS ET COORDONNÉES</h2>\
<p>Si vous souhaitez: accéder à, corriger, modifier ou supprimer toute information personnelle que nous avons à votre sujet, déposer une plainte, ou si vous souhaitez simplement avoir plus d’informations, contactez notre agent responsable des normes de confidentialité à contact@zanibet.com</p>' },
    ] }
  ];

  var helpArrEs = [
    { lang: 'es', priority: 1, icon: 'fa_ticket', subject: 'Boleto de juego', caption: 'Información del boleto de juego', qa: [
  { question: "¿Cuántos boletos hay disponibles cada semana?", answer: "ZaniBet te permite completar cuadrículas de predicción para cada jornada de diferentes competiciones de fútbol profesional <b>(Boleto « Multi »)</b>.<br>\
  También tiene la oportunidad de dar sus predicciones para cada partido programado para el día <b>(Boleto Simple »)</b>.<br>\
  A veces, se abren entradas especiales para eventos especiales como los partidos de la Copa del Mundo, el Campeonato de Europa.…<br><br>\
  Actualmente, ZaniBet le ofrece jugar más de <b>30 000 entradas individuales y 1000 entradas múltiples por temporada deportiva.</b> ! Lo que puede acumular millones de ZaniCoins y para los afortunados cientos de euros gracias a los jackpots." },

  { question: "¿Qué campeonatos de fútbol están disponibles en ZaniBet?",  answer: "<p><b>En ZaniBet puedes predecir los partidos de las siguientes competiciones :</b><br>\
  <ul>\
  <h2>Europe</h2>\
  <li><b>France :</b> Ligue 1</li><br>\
  <li><b>France :</b> Ligue 2</li><br>\
  <li><b>France :</b> National</li><br>\
  <li><b>Allemagne :</b> Bundesliga 1</li><br>\
  <li><b>Allemagne :</b> Bundesliga 2</li><br>\
  <li><b>Allemagne :</b> 3. Liga</li><br>\
  <li><b>Angleterre :</b> Premier League</li><br>\
  <li><b>Angleterre :</b> EFL Championship</li><br>\
  <li><b>Angleterre :</b> League One</li><br>\
  <li><b>Angleterre :</b> League Two</li><br>\
  <li><b>Pays Bas :</b> Eredivisie</li><br>\
  <li><b>Pays Bas :</b> Eerste Divisie</li><br>\
  <li><b>Italie :</b> Serie A</li><br>\
  <li><b>Italie :</b> Serie B</li><br>\
  <li><b>Portugal :</b> Primeira Liga</li><br>\
  <li><b>Portugal :</b> Segunda Liga</li><br>\
  <li><b>Espagne :</b> La Liga</li><br>\
  <li><b>Espagne :</b> La Liga 2</li><br>\
  <li><b>Espagne :</b> Segunda B : Groupe 1</li><br>\
  <li><b>Espagne :</b> Segunda B : Groupe 2</li><br>\
  <li><b>Espagne :</b> Segunda B : Groupe 3</li><br>\
  <li><b>Espagne :</b> Segunda B : Groupe 4</li><br>\
  <li><b>Turquie :</b> Super Lig</li><br>\
  <li><b>Belgique :</b> Pro League</li><br>\
  <li><b>Écosse :</b> Premiership</li><br>\
  <li><b>Écosse :</b> Championship</li><br>\
  <li><b>Écosse :</b> League One</li><br>\
  <li><b>Écosse :</b> League Two</li><br>\
  <li><b>Danemark :</b> Super League</li><br>\
  <li><b>Danemark :</b> First Division</li><br>\
  <li><b>Grèce :</b> Super League</li><br>\
  <li><b>Grèce :</b> Football League</li><br>\
  <li><b>Suède :</b> Allsvenskan</li><br>\
  <li><b>Suède :</b> Superettan</li><br>\
  <li><b>Suisse :</b> Super League</li><br>\
  <li><b>Suisse :</b> Challenge League</li><br>\
  <li><b>Slovaquie :</b> Super Liga</li><br>\
  <li><b>Slovaquie :</b> 2. Liga</li><br>\
  <li><b>Suède :</b> Superettan</li><br>\
  <li><b>Mecedoine :</b> MFL</li><br>\
  <li><b>Norvège :</b> Eliteserien</li><br>\
  <li><b>Finlande :</b> Veikkaysliiga</li><br>\
  <li><b>Russie :</b> Premier League</li><br>\
  <li><b>Albanie :</b> Superliga</li><br>\
  <li><b>Croatie :</b> 1. HNL</li><br>\
  <li><b>Pologne :</b> Ekstraklasa</li><br>\
  <li><b>Pologne :</b> 1. Liga</li><br>\
  <li><b>Malte :</b> Premier League</li><br>\
  <li><b>Autriche :</b> Tipico Bundesliga</li><br>\
  <li><b>Ukraine :</b> Premier League</li><br>\
  <li><b>Israel :</b> Ligat ha'Al</li><br>\
  <li><b>Israel :</b> Liga Leumit</li><br>\
  <h2>Amérique du nord</h2>\
  <li><b>USA :</b> Major League Soccer</li><br>\
  <li><b>USA :</b> United Soccer League</li><br>\
  <h2>Amérique du sud</h2>\
  <li><b>Brésil :</b> Serie A</li><br>\
  <li><b>Brésil :</b> Serie B</li><br>\
  <li><b>Argentine :</b> Superliga</li><br>\
  <li><b>Colombie :</b> Primera A - Apertura</li><br>\
  <li><b>Colombie :</b> Primera A - Clausura</li><br>\
  <li><b>Chilie :</b> Primera Division</li><br>\
  <li><b>Chilie :</b> Primera B</li><br>\
  <li><b>Mexique :</b> Liga MX</li><br>\
  <h2>Asie</h2>\
  <li><b>Chine :</b> Super League</li><br>\
  <li><b>Chine :</b> China League</li><br>\
  <li><b>Japon :</b> J League</li><br>\
  <li><b>Japon :</b> J League 2</li><br>\
  <li><b>Japon :</b> J League 3</li><br>\
  <li><b>Arabie Saoudite :</b> Pro League</li><br>\
  <li><b>Hong Kong :</b> Premier League</li><br>\
  <li><b>Singapore :</b> S League</li><br>\
  </ul>\
  </p>" },

  { question: "¿Para qué sirven los tokens?",  answer: "Las 'fichas' le permiten jugar con las cuadrículas de predicción para los partidos del día y los boletos especiales del juego." },

  { question: "¿Cómo obtener fichas?",  answer: "Todos los días, ZaniBet le ofrece varias fichas, si le quedan menos de 5 fichas. También tienes la opción de obtener fichas adicionales :<br><br>\
  -	Ver un video corto que dura entre 15 y 30 segundos. Esta acción solo es posible una vez cada 1 horas.<br><br>\
  -	<b>Al realizar una tarea propuesta por nuestros socios (encuesta, prueba de juego ...).</b> El número de misiones asignables depende de su país y puede consistir en probar una aplicación gratuita donde completar una encuesta." },

  { question: "¿Por cuánto tiempo se acreditan mis fichas?",  answer: "Si eliges obtener más fichas viendo un video, <b>tus fichas se acreditarán inmediatamente en tu cuenta</b> al final. En el caso de que hayas completado una tarea, tus fichas se acreditarán en tu cuenta entre 45 minutos y 24 horas. Este tiempo depende del tiempo de validación de nuestros socios. Sus fichas serán acreditadas tan pronto como recibamos una confirmación de ellas." },

  { question: "No recibí mis fichas mientras hacía una tarea, ¿qué hacer?",  answer: "En caso de que haya completado la tarea propuesta, respetando escrupulosamente los requisitos previos requeridos y no reciba sus fichas :<br>\
  -	Es posible seguir el estado de todas sus tareas actuales desde la interfaz de nuestros socios (Adscend).<br>\
  -	Puede hacer un reclamo por la tarea que no le fue acreditada.<br><br>\
  <b>Para garantizar sus posibilidades de recibir sus fichas, asegúrese de que:</b><br>\
  -	Todas las acciones solicitadas para completar la oferta deben completarse. Desinstalar la aplicación demasiado rápido o no completar una encuesta correctamente hará que sea imposible validar la oferta.<br>\
  -	Si ya hizo la oferta por primera vez o ya hizo la oferta a través de otra, no podrá recibir sus fichas.<br>\
  -	Se recomienda <b>ALTAMENTE completar una oferta utilizando una conexión Wifi estable</b> para evitar cualquier problema de comunicación.<br>\
  -	El uso de proxy, emulador, VPN u otros dispositivos para ocultar su identidad impedirá la validación de la oferta.<br><br>\
  Si a pesar de todas estas precauciones, no recibe sus fichas, ¡no dude en hacer un reclamo!" }
    ] },

    { lang: 'es', priority: 2, icon: 'md_grid_on', subject: 'Grillas', caption: 'Funcionamiento de las grillas', qa: [
  { question: '¿Hay un límite de cuadrícula jugable?', answer: 'Cada entrada del juego tiene un número máximo de grillas jugables. Un indicador del número de cuadrículas jugadas y jugables es visible en cada entrada del juego.' },

  { question: "¿Por qué siempre tengo cuadrículas esperando mientras terminan los juegos?",  answer: "No te preocupes ! ZaniBet es una aplicación joven con muchos algoritmos de procesamiento automático. Sin embargo, es posible que tengamos que verificar manualmente todos los resultados para garantizar que su pronóstico se tenga en cuenta correctamente." },

  { question: 'No puedo validar mi cuadrícula, ¿cómo puedo hacerlo?', answer: "En caso de que no pueda validar una red múltiple, esto puede deberse a varias razones, entre ellas:<br><br>\
  -	Ha alcanzado el límite de 8 cuadrículas válidas por hora.<br>\
  -	No hay videos disponibles para su ubicación.<br>\
  -	Su conexión interna es inestable, puede volver a intentarlo con una conexión wifi.<br><br>\
  <b>En caso de que no puedas validar una grilla simple:</b><br><br>\
  -	Verifica que tengas suficientes tokens.<br>\
  -	Comprueba que la coincidencia que intentas predecir todavía no haya comenzado." },

  { question: '¡No recibí mi recompensa completa por una grilla!', answer: "Si crees que no has recibido el número correcto de ZaniCoins en comparación con las predicciones que has jugado. Póngase en contacto con soporte con la referencia de su grilla en la dirección : <b>help@zanibet.com</b>" }

    ] },

    { lang: 'es', priority: 3, icon: 'fa_money', subject: 'Pago', caption: 'Ganancias de las redes de juego y la tienda', qa: [
  { question: '¿Cómo recibir mis ganancias?', answer: 'Para recibir sus ganancias, debe completar todos los campos en la página "Información de pago", accesible desde el menú "Mi perfil". Todos los pagos se realizan con PayPal dentro de los 30 días como máximo.' },
  { question: "Todavía no he recibido mis ganancias, ¿qué puedo hacer?", answer: "En caso de que no haya recibido las ganancias de su compra de cuadrículas / tienda dentro de 30 días:<br>- Verifique que ha completado correctamente su información de pago de su perfil.<br>- Verifique la carpeta de spam de sus correos electrónicos, para asegurarse de que no haya sido contactado por el servicio al cliente de ZaniBet.<br>No dude en ponerse en contacto con el servicio de atención al cliente en la siguiente dirección: contact@zanibet.com en cas de problème !" }
    ] },

    { lang: 'es', priority: 4, icon: 'fa_star', subject: 'Asociación', caption: 'Generar ingresos complementarios y recurrentes', qa: [

  { question: 'Conviértase en un embajador privilegiado de ZaniBet', answer: '¿Eres YouTubeur, blogger, influyente en el que solo quieres invertir activamente para ayudar a desarrollar ZaniBet? ¡Tenemos la oportunidad de ofrecerle <b>una asociación sostenible y lucrativa!<b><br><br><b>No dude en ponerse en contacto con nuestro servicio de atención al cliente</b> a contact@zanibet.com, para discutirlo.' },

    ] },

    { lang: 'es', priority: 5, icon: 'fa_exclamation_circle', subject: 'Queja y asistencia', caption: 'Cómo presentar una queja', qa: [

  { question: 'Completé una misión de Adscend pero no recibí mis fichas:', answer: 'Completé una misión de Adscend pero no recibí mis tokens: en caso de que haya realizado correctamente todas las acciones requeridas (pruebe una aplicación y consérvela por un tiempo) y no ha recibido sus tokens después de 24 horas puede hacer un reclamo. Para esto debes:<br><br>1 - Ve a la pantalla Misiones de Adscend.<br>2 -Haga clic en el <b>botón "Hamburger" en el lado derecho de la barra de navegación</b>.<br>3 - Seleccione la pestaña <b>« Offer History »</b>.<br>4 - Haga clic en el botón <b>« Missing Points »</b> para hacer un reclamo con nuestro socio, para la misión que no ha sido validada.<br>5 - Recibirá una respuesta dentro de los 5 días hábiles.' },

  { question: "Hice una solicitud de pago en la tienda, pero no recibí mi pago:", answer: "Si después de 7 días hábiles no ha recibido el pago de una recompensa en la tienda, gracias por:<br><br>1 - Verifique que ha proporcionado información de pago válida de su  « Perfil ».<br>2 - Verifique que la dirección de PayPal especificada pueda recibir pagos.<br>3 - Verifique que la dirección de correo electrónico de su cuenta esté actualizada para recibir sus certificados de regalo de Amazon.<br><br><b>Advertencia: ¡La cuenta múltiple (cuentas múltiples para el mismo usuario), el uso de VPN, proxy o cualquier otro sistema diseñado para ocultar su identidad / trampa está PROHIBIDO! Los usuarios que usan este tipo de dispositivo no recibirán sus ganancias.</b><br><br>Si aún así no se realizó su pago, <b>puede contactar al soporte en contact@zanibet.com</b>" },

  { question: "Gané parte del pozo de premios con una red múltiple sin culpa, pero no recibí mi pago :", answer: "Si después de 30 días hábiles no ha recibido el pago de una recompensa por una grilla ganadora :<br><br>1 - Verifique que haya proporcionado información de pago válida de su « Perfil ».<br>2 - Compruebe que la dirección de PayPal especificada puede recibir pagos.<br><br><b>Advertencia: ¡La cuenta múltiple (cuentas múltiples para el mismo usuario), el uso de VPN, proxy o cualquier otro sistema diseñado para ocultar su identidad / trampa está PROHIBIDO! Los usuarios que usan este tipo de dispositivo no recibirán sus ganancias.</b><br><br>Si aún así no se realizó el pago, <b>puede contactarse con la asistencia en contact@zanibet.com</b>" }

    ] },

    { lang: 'es', priority: 6, icon: 'fa_building', subject: 'Condiciones de uso', caption: '', qa: [
  { question: 'CGU - Mise à jour le 8 Mars 2018', answer: '<h1># Conditions générales d’utilisation de l’application ZaniBet</h1>\
  <p>Ces conditions générales d’utilisation s’appliquent à toute personne (ci-après dénommée « Utilisateur », « Joueur ») qui installe et utilise l’application ZaniBet (ci-après dénommée « Application », « App », « Jeu »).<br>\
  L’application ZaniBet est édité et géré par la société Devolios (ci-après dénommée « Éditeur»). Vous pouvez en savoir plus sur l’éditeur en consultant dans le kit de presse de l’application.</p>\
  <h2>## 1. Inscription, prérequis d’utilisation, mot de passe</h2>\
  <h3>## 1.1.</h3>\
  <p>L’application peut être utilisée gratuitement après création d’un compte utilisateur. L’utilisateur peut s’inscrire en indiquant son adresse email ou en utilisant la solution d’authentification en un clic proposée par Facebook. <b>Vous pouvez vous inscrire si :</b><br>\
  (a)	Vous avez 18 ans ou plus et possédez la majorité légale dans votre pays.<br>\
  (b)	Vous certifiez que les informations indiquées lors de votre inscription sont valides et précises.<br>\
  (c)	Vous ne possédez pas encore un compte sur l’Application.</p>\
  <h3>## 1.2.</h3>\
  <p>En complétant le formulaire d’inscription ou en utilisant Facebook Login, l’utilisateur enregistre un compte utilisateur ZaniBet, pour lui. Lorsque l’Éditeur confirme l’inscription, l’utilisateur aura accès à tous les services et fonctionnalités proposés par l’Application.</p>\
  <h3>## 1.3.</h3>\
  <p>La création d’un compte utilisateur est destinée à un usage privé et est obligatoire pour accéder au service de l’Application. L’Utilisateur doit fournir des informations complètes et justes. Un seul compte peut être créé par Utilisateur. Transférer ou vendre un compte à une autre partie est totalement INTERDIT. Le nom d’utilisateur utilisé ne doit pas violer les intérêts d’autrui ou enfreindre une loi.</p>\
  <h3>## 1.4.</h3>\
  <p>Lors de l’inscription, le mot de passe indiqué par l’utilisateur sera assigné à son compte. Si l’inscription se fait avec Facebook, l’utilisateur peut définir un mot de passe depuis son profil dans l’Application. L’Utilisateur ne doit en aucun communiquer son mot de passe à autrui. Dans le cas d’une perte de mot de passe, l’Utilisateur doit informer le support immédiatement.</p>\
  <h2>## 2. Suppression du compte</h2>\
  <h3>## 2.1</h3>\
  <p>L’Utilisateur peut demander la suppression de son compte à n’importe quel moment, en envoyant un email au support de l’application à cette adresse : contact@zanibet.com</p>\
  <h2>## 3. Spécifications générales</h2>\
  <p>ZaniBet est un jeu de simulation de pronostic sportif pour les matchs de football. L’Utilisateur à la possibilité de remplir des grilles de jeu où il doit prédire le résultat d’une série de matchs. Dans le cas où l’Utilisateur valide une grille ou tous les résultats sont corrects, l’Utilisateur remporte une partie de la cagnotte indiquée sur son compte PayPal. L’utilisateur a également la possibilité de pronostiquer les évènements des matchs devant avoir lieu dans les 48 heures pour les compétitions actives, en utilisant des jetons.<br>\
  Chaque fois qu’un Utilisateur pronostique un bon résultat, il accumule des ZaniCoins.</p>\
  <h2>## 4. Collecter des ZaniCoins</h2>\
  <h3>## 4.1.</h3>\
  <p>L’Application offre la possibilité aux utilisateurs d’accumuler des points de fidélités (ci-après dénommée « ZaniCoins ») :<br>\
  -	lors de la création d’un compte pour la première fois<br>\
  -	en réalisant des pronostics gagnants</p>\
  <h2>## 5. Echanger ses ZaniCoins et recevoir des récompenses</h2>\
  <h3>## 5.1.</h3>\
  <p>Les Utilisateurs peuvent échanger leurs ZaniCoins contre la récompense de leur choix à un taux défini par l’Éditeur. Les récompenses peuvent être par exemple des crédits PayPal, des cartes cadeaux Amazon ou tout autre récompense virtuelle pour un autre service. L’Utilisateur peut sélectionner la récompense de son choix depuis la section « Boutique » de l’Application. L’Utilisateur peut choisir n’importe quelle récompense proposée par l’Éditeur à condition d’avoir suffisamment de ZaniCoins.</p>\
  <h3>## 5.2.</h3>\
  <p>L’Éditeur transfèrera les gains en cash directement sur le compte PayPal de l’Utilisateur. Pour recevoir ses gains, l’Utilisateur doit obligatoirement compléter ses informations de paiement.</p>\
  <h3>## 5.3.</h3>\
  <p>Lors de l’échange des ZaniCoins contre une récompense, le taux de change au moment de l’échange est toujours appliqué. L’Éditeur se réserve le droit de modifier ou d’ajuster le taux de change suivant le cours des évènements.</p>\
  <h2>## 6. Garantie d’un jeu loyal</h2>\
  <h3>## 6.1.</h3>\
  <p>L’Utilisateur n’a le droit de créer qu’un seul et unique compte pour l’Application. Le « multi-compte » est formellement interdit ! Si notre système de sécurité détecte plusieurs comptes appartenant à la même personne, l’Éditeur se réserve le droit de bannir tous les comptes fautifs.</p>\
  <h3>## 6.2.</h3>\
  <p>L’utilisation de programmes destinés à manipuler et truquer les résultats où le nombres de grilles validables est prohibée. Si un Utilisateur est surpris à tenter d’exploiter une faille, bug, ou tout autre avantage déloyal, son compte sera suspendu.</p><br>\
  Mise à jour de 8 Mars 2018' }
    ] },

    { lang: 'es', priority: 7, icon: 'fa_user_secret', subject: 'Política de confidencialidad', caption: '', qa: [
  { question: 'Confidentialité - Mise à jour le 8 Mars 2018', answer: '<h2>ARTICLE 1 – RENSEIGNEMENTS PERSONNELS RECUEILLIS</h2>\
  <p>Lorsque vous effectuez un achat sur notre boutique, dans le cadre de notre processus d’achat et de vente, nous recueillons les renseignements personnels que vous nous fournissez, tels que votre nom, votre adresse et votre adresse e-mail. Lorsque vous naviguez sur notre boutique, nous recevons également automatiquement l’adresse de protocole Internet (adresse IP) de votre ordinateur, qui nous permet d’obtenir plus de détails au sujet du navigateur et du système d’exploitation que vous utilisez. Marketing par e-mail (le cas échéant): Avec votre permission, nous pourrions vous envoyer des e-mails au sujet de notre boutique, de nouveaux produits et d’autres mises à jour.</p>\
  <h2>ARTICLE 2 - CONSENTEMENT</h2>\
  <p>Comment obtenez-vous mon consentement? Lorsque vous nous fournissez vos renseignements personnels pour conclure une transaction, vérifier votre carte de crédit, passer une commande, planifier une livraison ou retourner un achat, nous présumons que vous consentez à ce que nous recueillions vos renseignements et à ce que nous les utilisions à cette fin uniquement. Si nous vous demandons de nous fournir vos renseignements personnels pour une autre raison, à des fins de marketing par exemple, nous vous demanderons directement votre consentement explicite, ou nous vous donnerons la possibilité de refuser. Comment puis-je retirer mon consentement? Si après nous avoir donné votre consentement, vous changez d’avis et ne consentez plus à ce que nous puissions vous contacter, recueillir vos renseignements ou les divulguer, vous pouvez nous en aviser en nous contactant à support@zanibet.com.</p>\
  <h2>ARTICLE 3 – DIVULGATION</h2>\
  <p>Nous pouvons divulguer vos renseignements personnels si la loi nous oblige à le faire ou si vous violez nos Conditions Générales de Vente et d’Utilisation.</p>\
  <h2>ARTICLE 4 – SERVICES FOURNIS PAR DES TIERS</h2>\
  <p>De manière générale, les fournisseurs tiers que nous utilisons vont uniquement recueillir, utiliser et divulguer vos renseignements dans la mesure du nécessaire pour pouvoir réaliser les services qu’ils nous fournissent. Cependant, certains tiers fournisseurs de services, comme les passerelles de paiement et autres processeurs de transactions de paiement, possèdent leurs propres politiques de confidentialité quant aux renseignements que nous sommes tenus de leur fournir pour vos transactions d’achat. En ce qui concerne ces fournisseurs, nous vous recommandons de lire attentivement leurs politiques de confidentialité pour que vous puissiez comprendre la manière dont ils traiteront vos renseignements personnels. Il ne faut pas oublier que certains fournisseurs peuvent être situés ou avoir des installations situées dans une juridiction différente de la vôtre ou de la nôtre. Donc si vous décidez de poursuivre une transaction qui requiert les services d’un fournisseur tiers, vos renseignements pourraient alors être régis par les lois de la juridiction dans laquelle ce fournisseur se situe ou celles de la juridiction dans laquelle ses installations sont situées. À titre d’exemple, si vous êtes situé au Canada et que votre transaction est traitée par une passerelle de paiement située aux États-Unis, les renseignements vous appartenant qui ont été utilisés pour conclure la transaction pourraient être divulgués en vertu de la législation des États-Unis, y compris le Patriot Act. Une fois que vous quittez le site de notre boutique ou que vous êtes redirigé vers le site web ou l’application d’un tiers, vous n’êtes plus régi par la présente Politique de Confidentialité ni par les Conditions Générales de Vente et d’Utilisation de notre site web. Liens Vous pourriez être amené à quitter notre site web en cliquant sur certains liens présents sur notre site. Nous n’assumons aucune responsabilité quant aux pratiques de confidentialité exercées par ces autres sites et vous recommandons de lire attentivement leurs politiques de confidentialité.</p>\
  <h2>ARTICLE 5 – SÉCURITÉ</h2>\
  <p>Pour protéger vos données personnelles, nous prenons des précautions raisonnables et suivons les meilleures pratiques de l’industrie pour nous assurer qu’elles ne soient pas perdues, détournées, consultées, divulguées, modifiées ou détruites de manière inappropriée. Si vous nous fournissez vos informations de carte de crédit, elles seront chiffrées par le biais de l’utilisation du protocole de sécurisation SSL et conservées avec un chiffrement de type AES-256. Bien qu’aucune méthode de transmission sur Internet ou de stockage électronique ne soit sûre à 100 %, nous suivons toutes les exigences de la norme PCI-DSS et mettons en œuvre des normes supplémentaires généralement reconnues par l’industrie.</p>\
  <h2>ARTICLE 6 – ÂGE DE CONSENTEMENT</h2>\
  <p>En utilisant ce site, vous déclarez que vous avez au moins l’âge de la majorité dans votre État ou province de résidence, et que vous nous avez donné votre consentement pour permettre à toute personne d’âge mineur à votre charge d’utiliser ce site web.</p>\
  <h2>ARTICLE 7 – MODIFICATIONS APPORTÉES À LA PRÉSENTE POLITIQUE DE CONFIDENTIALITÉ</h2>\
  <p>Nous nous réservons le droit de modifier la présente politique de confidentialité à tout moment, donc veuillez s’il vous plait la consulter fréquemment. Les changements et les clarifications prendront effet immédiatement après leur publication sur le site web. Si nous apportons des changements au contenu de cette politique, nous vous aviserons ici qu’elle a été mise à jour, pour que vous sachiez quels renseignements nous recueillons, la manière dont nous les utilisons, et dans quelles circonstances nous les divulguons, s’il y a lieu de le faire. Si notre boutique fait l’objet d’une acquisition par ou d’une fusion avec une autre entreprise, vos renseignements pourraient être transférés aux nouveaux propriétaires pour que nous puissions continuer à vous vendre des produits.</p>\
  <h2>QUESTIONS ET COORDONNÉES</h2>\
  <p>Si vous souhaitez: accéder à, corriger, modifier ou supprimer toute information personnelle que nous avons à votre sujet, déposer une plainte, ou si vous souhaitez simplement avoir plus d’informations, contactez notre agent responsable des normes de confidentialité à contact@zanibet.com</p>' },
    ] }
  ];

var helpArrFinal = helpArr.concat(helpArrEn);
helpArrFinal = helpArrFinal.concat(helpArrEs);
helpArrFinal = helpArrFinal.concat(helpArrPt);

  Help.remove(function(err, result){
    if (err){
return res.status(500).json(err);
    }

    async.eachLimit(helpArrFinal, 1, function(help, eachHelp){
Help.create({ priority: help.priority, icon: help.icon, subject: help.subject, caption: help.caption, qa: help.qa, lang: help.lang }, function(err, res){
  if (err) return eachHelp(err);
  eachHelp();
});
    }, function(err, result){
return res.status(200).json(result);
    });
  });
});

module.exports = router;
