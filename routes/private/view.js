const db = require('../../connectors/db');
const roles = require('../../constants/roles');
const { getSessionToken } = require('../../utils/session');

const getUser = async function(req) {
  const sessionToken = getSessionToken(req);
  if (!sessionToken) {
    return res.status(301).redirect('/');
  }

  const user = await db.select('*')
    .from('se_project.sessions')
    .where('token', sessionToken)
    .innerJoin('se_project.users', 'se_project.sessions.userid', 'se_project.users.id')
    .innerJoin('se_project.roles', 'se_project.users.roleid', 'se_project.roles.id')
    .first();
  
  console.log('user =>', user)
  user.isStudent = user.roleid === roles.student;
  user.isAdmin = user.roleid === roles.admin;
  user.isSenior = user.roleid === roles.senior;

  return user;  
}

module.exports = function(app) {
  // Register HTTP endpoint to render /users page
  app.get('/dashboard', async function(req, res) {
    const user = await getUser(req);
    if(user.roleid === 2){
      return res.render('dashboardadmin', {user});
    }
    else{
    return res.render('dashboard', user);
    }
  });

  app.get('/dashboardadmin', async function(req, res) {
    const user = await getUser(req);
    return res.render('dashboardadmin', {user});    
  });


  app.get('/index' ,function(req,res){
    return res.render('index')
  })
  

  // Register HTTP endpoint to render /users page
  app.get('/users', async function(req, res) {
    const users = await db.select('*').from('se_project.users');
    return res.render('users', { users });
  });

  // Register HTTP endpoint to render /courses page

  app.get('/stations', async function(req, res) {
    const user = await getUser(req);
    const stations = await db.select('*').from('se_project.stations');
    return res.render('stations_example', { ...user, stations });
  });

  app.get("/subscriptions",async function(req,res){
    const user = await getUser(req);
    const zones = await db.select("*").from("se_project.zones")
    return res.render('subscriptions',{zones})
  })
   
  app.get("/tickets",async function(req,res){
    const user = await getUser(req)
    const stations = await db.select("*").from("se_project.stations")
    const sub = await db.select("*").from("se_project.subsription").where("userid",user.userid).andWhere("nooftickets","<>",0)
    return res.render('ticket',{stations,sub})
  })

  app.get("/rides",async function(req,res){
    const stations = await db.select("*").from("se_project.stations")
    const rides = await db.select("*").from("se_project.rides")
    const user = await getUser(req)
    return res.render('rides',{stations,rides,user})
  })
  app.get("/requests",async function(req,res){
    return res.render('requests')
  })
  app.get("/refund",async function(req,res){
    return res.render('refund')
  })
  app.get("/senior",async function(req,res){
    return res.render('senior')
  })
  app.get("/reset",async function(req,res){
    return res.render('reset')
  })
  app.get("/userinfo",async function(req,res){
    const user = await getUser(req)
    const tickets = await db
  .select("*")
  .from("se_project.tickets")
  .join("se_project.transactions", "transactions.purchasediid", "=", db.raw("CAST(tickets.id AS text)"))
  .where("tickets.userid", user.userid).andWhere("purchasetype","<>","sub");

    const upcoming_rides = await db.select("*").from("se_project.rides").where("userid",user.userid).andWhere("status","upcoming")
    const Completed_rides = await db.select("*").from("se_project.rides").where("userid",user.userid).andWhere("status","Completed")
    const sub = await db.select('*')
    .from('se_project.subsription')
    .join('se_project.zones as zones', 'zones.id', '=', 'subsription.zoneid').where("subsription.userid",user.userid).andWhere("subsription.nooftickets","<>",0)
    return res.render('userinfo',{tickets,upcoming_rides,Completed_rides,sub})
  })
  
  app.get("/createstation",async function(req,res){
    const stations = await db.select("*").from("se_project.stations")
    return res.render('createstation',{stations})
  })
  app.get("/updatestation",async function(req,res){
    const stations = await db.select("*").from("se_project.stations")
    return res.render('updatestation',{stations})
  })

  app.get("/deletestation",async function(req,res){
    const stations = await db.select("*").from("se_project.stations").whereNotNull("stationposition")
    return res.render('deletestation',{stations})
  })

  app.get("/createroute",async function(req,res){
    const stationid = await db.select("*").from("se_project.stations").where("stationposition",null)
    const connect = await db.select("*").from("se_project.stations").whereNot({stationposition:'middle'}).whereNot({stationposition:'null'})
    const routes = await db.select('routes.id', 'routes.routename', 'fromStation.stationname as fromStationName', 'toStation.stationname as toStationName')
    .from('se_project.routes')
    .join('se_project.stations as fromStation', 'routes.fromstationid', '=', 'fromStation.id')
    .join('se_project.stations as toStation', 'routes.tostationid', '=', 'toStation.id')
    return res.render('createroute',{stationid,connect,routes})
  })

  app.get("/deleteroute",async function(req,res){
    const routes = await db.select('routes.id', 'routes.routename', 'fromStation.stationname as fromStationName', 'toStation.stationname as toStationName')
    .from('se_project.routes')
    .join('se_project.stations as fromStation', 'routes.fromstationid', '=', 'fromStation.id')
    .join('se_project.stations as toStation', 'routes.tostationid', '=', 'toStation.id')
    return res.render('deleteroute',{routes})
  })

  app.get("/updateroute",async function(req,res){
    const routes = await db.select('routes.id', 'routes.routename', 'fromStation.stationname as fromStationName', 'toStation.stationname as toStationName')
    .from('se_project.routes')
    .join('se_project.stations as fromStation', 'routes.fromstationid', '=', 'fromStation.id')
    .join('se_project.stations as toStation', 'routes.tostationid', '=', 'toStation.id')
    return res.render('updateroute',{routes})
  })
  app.get("/refundresponse",async function(req,res){

    const request = await db.select("*").from("se_project.refund_requests").where({status:"pending"})
    return res.render('refundresponse',{request})
  })

    
  app.get("/seniorresponse",async function(req,res){

    const request = await db.select("*").from("se_project.senior_requests").where({status:"pending"})
    return res.render('seniorresponse',{request})
  })

  app.get("/updatezones",async function(req,res){

    const zones = await db.select("*").from("se_project.zones")
    return res.render('updatezones',{zones})
  })
  app.get("/resetadmin",async function(req,res){
    return res.render('resetadmin')
  })

};