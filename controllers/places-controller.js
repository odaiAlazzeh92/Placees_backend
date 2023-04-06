const { validationResult } = require("express-validator");
const mongoose = require("mongoose");
const fs = require("fs");

const HttpError = require("../models/http-error");
const getCoordsForAddress = require("../util/location");
const Place = require("../models/place");
const User = require("../models/user");

exports.getPlaceById = async (req, res, next) => {
  const placeId = req.params.pid;

  let place;
  try {
    place = await Place.findById(placeId);
  } catch (err) {
    const error = new HttpError(
      "Something went wrong, could not find a place.",
      500
    );
    return next(error);
  }

  if (!place) {
    const error = new HttpError(
      "Could not find a place for the provided id.",
      404
    );
    return next(error);
  }

  res.json({ place: place.toObject({ getters: true }) });
};

exports.getPlacesByUserId = async (req, res, next) => {
  const userId = req.params.uid;

  let places;
  try {
    places = await Place.find({ creator: userId });
  } catch (err) {
    const error = new HttpError(
      "Something went wrong, could not find a place.",
      500
    );
    return next(error);
  }

  if (!places || places.length === 0) {
    return res.json({
      places: [],
    });
    // return next(
    //   new HttpError("Could not find places for the provided user id.", 404)
    // );
  }
  res.json({
    places: places.map((place) => place.toObject({ getters: true })),
  });
};

exports.createPlace = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(
      new HttpError("Invalid inputs passed, please check your data.", 422)
    );
  }

  const { title, description, address } = req.body;
  const creator = req.userData.userId
  let coordinates;

  try {
    coordinates = await getCoordsForAddress(address);
  } catch (error) {
    return next(error);
  }

  const createdPlace = new Place({
    creator,
    title,
    description,
    address,
    location: coordinates,
    image: req.file.path,
  });

  let user;
  try {
    user = await User.findById(creator);
  } catch (err) {
    const error = new HttpError(
      "Creating place failed, please try again.",
      500
    );
    return next(error);
  }

  if (!user) {
    const error = new HttpError(
      "Could not find a user for the provided id, please try again.",
      404
    );
    return next(error);
  }

  try {
    const sess = await mongoose.startSession();
    sess.startTransaction();
    await createdPlace.save({ session: sess });
    user.places.push(createdPlace);
    await user.save({ session: sess });
    await sess.commitTransaction();
  } catch (err) {
    const error = new HttpError(
      "Creating-place failed, please try again.",
      500
    );
    console.log(err);
    return next(error);
  }

  res.status(201).json({ place: createdPlace.toObject({ getters: true }) });
};

exports.updatePlace = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const error = new HttpError(
      "Invalid inputs passed, please check your data.",
      422
    );
    return next(error);
  }

  const { title, description } = req.body;
  const placeId = req.params.pid;

  let place;
  try {
    place = await Place.findById(placeId);
  } catch (err) {
    const error = new HttpError(
      "Updating place failed, please try again.",
      500
    );
    return next(error);
  }

  if (place.creator.toString() !== req.userData.userId) {
    const error = new HttpError(
      "You are not allowed to edit this place, please try again.",
      401
    );
    return next(error);
  }

  let updatedPlace;
  try {
    updatedPlace = await Place.findByIdAndUpdate(
      placeId,
      {
        title,
        description,
      },
      { new: true, runValidators: true }
    );
  } catch (err) {
    const error = new HttpError(
      "Updating place failed, please try again.",
      500
    );
    return next(error);
  }

  res.status(200).json({
    place: updatedPlace.toObject({ getters: true }),
  });
};

exports.deletePlace = async (req, res, next) => {
  const placeId = req.params.pid;

  let place;
  try {
    place = await Place.findById(placeId).populate("creator");
  } catch (err) {
    const error = new HttpError(
      "Deleting place failed, please try again.",
      500
    );
    return next(error);
  }

  if (!place) {
    const error = new HttpError("Could not find a place for this id.", 404);
    return next(error);
  }

  if (place.creator.id !== req.userData.userId) {
    const error = new HttpError(
      "You are not allowed to delete this place, please try again.",
      401
    );
    return next(error);
  }

  const imagePath = place.image;

  try {
    const sess = await mongoose.startSession();
    sess.startTransaction();
    await Place.deleteOne(place).session(sess);
    place.creator.places.pull(place);
    await place.creator.save({ session: sess });
    await sess.commitTransaction();
  } catch (err) {
    console.log(err);
    const error = new HttpError(
      "Deleting-place failed, please try again.",
      500
    );
    return next(error);
  }
  fs.unlink(imagePath, (err) => {
    console.log(err);
  });
  res.status(200).json({ message: "Deleted place." });
};
