import React, { Component } from "react"
import AvatarEditor from "react-avatar-editor"
import Select from "react-select"
import Dropzone from "react-dropzone"
import "react-select/dist/react-select.css"

import { createProfile, uploadPicture } from "./api"
import {
  clinicalSpecialtyOptions,
  additionalInterestOptions,
  hospitalOptions
} from "./options"
import AppScreen from "./AppScreen"

export default class EditProfile extends Component {
  state = {
    position: { x: 0.5, y: 0.5 },
    scale: 1,
    rotate: 0,
    width: 200,
    height: 200,
    name: "",
    email: "",
    imageUrl: null,
    imageSuccess: false,
    uploadingImage: false,
    affiliations: [],
    clinicalSpecialties: [],
    additionalInterests: [],
    additionalInformation: ""
  }

  handleSelectClinicalSpecialties = specialties => {
    this.setState({
      clinicalSpecialties: specialties.map(specialty => specialty.value)
    })
  }

  handleSelectAffiliations = affiliations => {
    this.setState({
      affiliations: affiliations.map(affiliation => affiliation.value)
    })
  }

  handleSelectAdditionalInterests = interests => {
    this.setState({
      additionalInterests: interests.map(interest => interest.value)
    })
  }

  setAdditionalInformation = ({ target }) => {
    this.setState({
      additionalInformation: target.value
    })
  }

  submit = () => {
    createProfile(this.state).then(profile => {
      window.location = `/profiles/${profile.id}`
    })
  }

  setName = ({ target }) => {
    this.setState({ name: target.value })
  }

  setEmail = ({ target }) => {
    this.setState({ email: target.value })
  }

  handleDrop = acceptedFiles => {
    this.setState({ image: acceptedFiles[0] })
  }

  handleNewImage = e => {
    this.setState({ image: e.target.files[0] })
  }

  handleScale = e => {
    const scale = parseFloat(e.target.value)
    this.setState({ scale })
  }

  saveImage = () => {
    const { image } = this.state
    this.setState({uploadingImage: true})
    uploadPicture(image).then(response => {
      this.setState({
        imageUrl: response.image_url,
        imageSuccess: true,
        uploadingImage: false
      })
    })
  }

  render() {
    return (
      <AppScreen className="edit-profile">
        <div className="columns">
          <div className="column contact">
            <Dropzone
              onDrop={this.handleDrop}
              disableClick
              multiple={false}
              style={{ width: "200px", height: "200px", marginBottom: "55px" }}
            >
              <AvatarEditor
                borderRadius={100}
                image={this.state.image}
                scale={parseFloat(this.state.scale)}
                width={180}
                height={180}
              />
            </Dropzone>
            <input name="newImage" type="file" onChange={this.handleNewImage} />
            <input
              name="scale"
              type="range"
              onChange={this.handleScale}
              min={this.state.allowZoomOut ? "0.1" : "1"}
              max="2"
              step="0.01"
              defaultValue="1"
            />
            <input value={this.state.uploadingImage ? "Uploading..." : "Save image"}
                   type="submit"
                   onClick={this.saveImage}/>
            {this.state.imageSuccess ? 'Image uploaded' : null}
          </div>
          <div
            className="about"
            style={{ width: "450px", paddingLeft: "50px" }}
          >
            <p>Name</p>
            <input type="text" name="name" onChange={this.setName} />

            <p>Preferred contact email</p>
            <input name="email" type="email" onChange={this.setEmail} />

            <p>Hospital Affiliations</p>
            <Select
              className="column"
              multi
              options={hospitalOptions}
              value={this.state.affiliations}
              onChange={this.handleSelectAffiliations}
            />

            <p>Clinical Interests</p>
            <Select
              className="column"
              multi
              options={clinicalSpecialtyOptions}
              value={this.state.clinicalSpecialties}
              onChange={this.handleSelectClinicalSpecialties}
            />

            <p>Additional Interests</p>
            <Select
              className="column"
              multi
              options={additionalInterestOptions}
              value={this.state.additionalInterests}
              onChange={this.handleSelectAdditionalInterests}
            />

            <p>Additional Information</p>
            <textarea
              onChange={this.setAdditionalInformation}
              maxLength={500}
              style={{
                width: "100%",
                height: "3em",
                fontSize: "18px"
              }}
            />
          </div>
        </div>
        <div>
          <h2>Expectations</h2>
          <p>TODO</p>
          <h2>Cadence</h2>
          <p>TODO</p>
          <button className="button" onClick={this.submit}>
            Save changes
          </button>
        </div>
      </AppScreen>
    )
  }
}
