let express = require('express'),
  multer = require('multer'),
  uuidv4 = require('uuid/v4'),
  router = express.Router();
let uploads = require('../../models/Uploads');
let reviews = require('../../models/Reviews');
const auth = require('../../middleware/auth');
let path = require('path');
const Users = require('../../models/Users');
const { check, validationResult } = require('express-validator');

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.resolve(__dirname, '../../public/'));
  },
  filename: (req, file, cb) => {
    const fileName = file.originalname.toLowerCase().split(' ').join('-');
    cb(null, uuidv4() + '-' + fileName);
  },
});

var upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (
      file.mimetype == 'image/png' ||
      file.mimetype == 'image/gif' ||
      file.mimetype == 'image/jpeg'
    ) {
      cb(null, true);
    } else {
      cb(null, false);
      return cb(new Error('Only .GIF, .PNG and .JPEG format allowed!'));
    }
  },
});

// uploads
router.post('/', auth, upload.single('image'), async (req, res, next) => {
  const url = req.protocol + '://' + req.get('host');
  const user = await Users.findById(req.user.id).select('-password');

  const userupload = new uploads({
    user: req.user.id,
    Name: req.body.Name,
    image: 'https://cookingblog25.herokuapp.com' + '/public/' + req.file.filename,
    Text:req.body.Text,
  });

  userupload
    .save()
    .then(async (result) => {
      const editor = await Users.findOne({ type: 'reviewer', status: 'available' });
      if (!editor) {
        return res.status(400).json({ errors: [{ msg: 'No reviewer is available right now' }] });
      }

      const editorReview = new reviews({
        editor: editor._id,
        gesture: result._id,
        decision: 'Pending'
      });

      await editorReview.save();

      const transporter = nodemailer.createTransport({
        service: 'gmail',
        secure: false,
        auth: {
          user: process.env.EMAIL_ADDRESS,
          pass: process.env.EMAIL_PASSWORD
        }
      });
  
      const mailOptions = {
        from: 'shahzeenahmed031@gmail.com',
        to: editor.email,
        subject: 'PSL!!! New gesture assigned',
        html: `<!doctype html>  <html lang="en-US">
  
         <head>
             <meta content="text/html; charset=utf-8" http-equiv="Content-Type" />
             <title>New Gesture Assigned</title>
             <meta name="description" content="New Gesture Assigned.">
             <style type="text/css">
                 a:hover {text-decoration: underline !important;}
             </style>
             <script src="https://kit.fontawesome.com/a076d05399.js"></script>
         </head>
         
         <body marginheight="0" topmargin="0" marginwidth="0" style="margin: 0px; background-color: #f2f3f8;" leftmargin="0">
             <!--100% body table-->
             <table cellspacing="0" border="0" cellpadding="0" width="100%" bgcolor="#f2f3f8"
                 style="@import url(https://fonts.googleapis.com/css?family=Rubik:300,400,500,700|Open+Sans:300,400,600,700); font-family: 'Open Sans', sans-serif;">
                 <tr>
                     <td>
                         <table style="background-color: #f2f3f8; max-width:670px;  margin:0 auto;" width="100%" border="0"
                             align="center" cellpadding="0" cellspacing="0">
                             <tr>
                                 <td style="height:80px;">&nbsp;</td>
                             </tr>
                             <tr>
                                 <td style="text-align:center;">
                                   <a >
                                   <i class="fas fa-pizza-slice"></i>
                                   </a>
                                 </td>
                             </tr>
                             <tr>
                                 <td style="height:20px;">&nbsp;</td>
                             </tr>
                             <tr>
                                 <td>
                                     <table width="95%" border="0" align="center" cellpadding="0" cellspacing="0"
                                         style="max-width:670px;background:#fff; border-radius:3px; text-align:center;-webkit-box-shadow:0 6px 18px 0 rgba(0,0,0,.06);-moz-box-shadow:0 6px 18px 0 rgba(0,0,0,.06);box-shadow:0 6px 18px 0 rgba(0,0,0,.06);">
                                         <tr>
                                             <td style="height:40px;">&nbsp;</td>
                                         </tr>
                                         <tr>
                                             <td style="padding:0 35px;">
                                                 <h1 style="color:#1e1e2d; font-weight:500; margin:0;font-size:32px;font-family:'Rubik',sans-serif;"> Reset Password Email</h1>
                                                 <span
                                                     style="display:inline-block; vertical-align:middle; margin:29px 0 26px; border-bottom:1px solid #cecece; width:100px;"></span>
                                                 <p style="color:#455056; font-size:15px;line-height:24px; margin:0;">
                                                Your new Blog is Uploded!
                                                 </p>
                                             </td>
                                         </tr>
                                         <tr>
                                             <td style="height:40px;">&nbsp;</td>
                                         </tr>
                                     </table>
                                 </td>
                             <tr>
                                 <td style="height:20px;">&nbsp;</td>
                             </tr>
                             <tr>
                                 <td style="text-align:center;">
                                     <p style="font-size:14px; color:rgba(69, 80, 86, 0.7411764705882353); line-height:18px; margin:0 0 0;">&copy; <strong>www.psl.com</strong></p>
                                 </td>
                             </tr>
                             <tr>
                                 <td style="height:80px;">&nbsp;</td>
                             </tr>
                         </table>
                     </td>
                 </tr>
             </table>
             <!--/100% body table-->
         </body>
         
          </html>`
      };

      transporter.sendMail(mailOptions, (err, response) => {
        if (err) {
          console.error('there was an error: ', err);
          throw err;
        } else {
          res.status(201).json({
            message: 'uploads successfully!',
            
          });
        }
      });
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({
        error: err,
      });
    });
});

//get all Uploads
router.get('/', async (req, res, next) => {
  try {
    const Uploads = await uploads.find().sort({ date: -1 });
    res.json(Uploads);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

//edit uplodad
router.post(
  '/edit',
  [[check('Text', 'Text is required').not().isEmpty()]],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      Text,
      Name,
      id
    } = req.body;

    const uploadsFields = {};
    uploadsFields.id = id;
    if (Name) uploadsFields.Name = Name;
    if (Text) uploadsFields.Text = Text;
  
   
    

    try {
      let Uploads = await uploads.findById(id);
     
      //update
      if (Uploads) {
        let Upload = await uploads.findOneAndUpdate(
          { _id: id },
          { $set: uploadsFields },
          { new: true }
        );
        return res.json(uploads);
      }

      
      await Upload.save();
      
      res.json(Upload);
    } catch (err) {
      console.error(err.message);
      res.status(500).send('server Error');
    }
  }
);

// @route    DELETE api/posts/:id
// @desc     Delete a post
// @access   Private
router.delete('/:id', async (req, res) => {
  try {
    const post = await uploads.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ msg: 'Post not found' });
    }

    await post.remove();

    res.json({ msg: 'Post removed' });
  } catch (err) {
    console.error(err.message);

    res.status(500).send('Server Error');
  }
});


//get user uploads
router.get('/:id', async (req, res) => {
  try {
    const Uploads = await uploads.find({ user: req.params.id}).sort({ date: -1 });;
    if (!Uploads) {
      return res.status(404).json({
        msg: 'Uploads not found',
      });
    }
    res.json(Uploads);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({
        msg: 'Uploads not found',
      });
    }
    res.status(500).send('Server Error');
  }
});

//get user uploads
router.get('/single/:id', async (req, res) => {
  try {
    const Uploads = await uploads.findById(req.params.id).sort({ date: -1 });;
    if (!Uploads) {
      return res.status(404).json({
        msg: 'Uploads not found',
      });
    }
    res.json(Uploads);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({
        msg: 'Uploads not found',
      });
    }
    res.status(500).send('Server Error');
  }
});


//get user uploads for landing page
router.get('/last/five/uploads', async (req, res) => {
  try {
    const Uploads = await uploads.find().sort({ date: -1 }).limit(6);
    res.json(Uploads);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});






module.exports = router;
