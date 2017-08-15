import React, { Component, PropTypes } from 'react'
import { bindActionCreators } from 'redux'
import { connect } from 'react-redux'
import { Person } from 'blockstack'
import Modal from 'react-modal'
import Alert from '../components/Alert'
import IdentityItem from './components/IdentityItem'
import InputGroup from '../components/InputGroup'
import { IdentityActions } from './store/identity'
import { AccountActions }  from '../account/store/account'

import log4js from 'log4js'

const logger = log4js.getLogger('profiles/AllProfilesPage.js')

function mapStateToProps(state) {
  return {
    localIdentities: state.profiles.identity.localIdentities,
    namesOwned: state.profiles.identity.namesOwned,
    createProfileError: state.profiles.identity.createProfileError,
    identityAddresses: state.account.identityAccount.addresses,
    nextUnusedAddressIndex: state.account.identityAccount.addressIndex,
    api: state.settings.api,
    encryptedBackupPhrase: state.account.encryptedBackupPhrase
  }
}

function mapDispatchToProps(dispatch) {
  return bindActionCreators(Object.assign({}, IdentityActions, AccountActions), dispatch)
}

class IdentityPage extends Component {
  static propTypes = {
    localIdentities: PropTypes.object.isRequired,
    createNewProfile: PropTypes.func.isRequired,
    refreshIdentities: PropTypes.func.isRequired,
    namesOwned: PropTypes.array.isRequired,
    api: PropTypes.object.isRequired,
    identityAddresses: PropTypes.array.isRequired,
    nextUnusedAddressIndex: PropTypes.number.isRequired,
    encryptedBackupPhrase: PropTypes.string.isRequired,
    resetCreateNewProfileError: PropTypes.func.isRequired,
    createProfileError: PropTypes.string
  }

  constructor(props) {
    super(props)

    this.state = {
      localIdentities: this.props.localIdentities,
      passwordPromptIsOpen: false,
      processing: false,
      password: ''
    }

    console.log(props)

    this.onValueChange = this.onValueChange.bind(this)
    this.createNewProfile = this.createNewProfile.bind(this)
    this.availableIdentityAddresses = this.availableIdentityAddresses.bind(this)
    this.openPasswordPrompt = this.openPasswordPrompt.bind(this)
    this.closePasswordPrompt = this.closePasswordPrompt.bind(this)
  }

  componentWillMount() {
    logger.trace('componentWillMount')
    this.props.refreshIdentities(
      this.props.api,
      this.props.identityAddresses,
      this.props.localIdentities,
      this.props.namesOwned
    )
  }

  componentWillReceiveProps(nextProps) {
    logger.trace('componentWillReceiveProps')
    this.setState({
      localIdentities: nextProps.localIdentities
    })
    if (nextProps.createProfileError) {
      this.setState({
        processing: false
      })
    }

    const currentIdentityCount = Object.keys(this.props.localIdentities).length

    const newIdentityCount = Object.keys(nextProps.localIdentities).length
    if (currentIdentityCount < newIdentityCount) {
      this.setState({
        processing: false,
        password: ''
      })
      this.closePasswordPrompt()
    }
  }

  onValueChange(event) {
    this.setState({
      [event.target.name]: event.target.value
    })
  }

  createNewProfile(event) {
    logger.trace('createNewProfile')
    this.setState({
      processing: true
    })
    event.preventDefault()
    const encryptedBackupPhrase = this.props.encryptedBackupPhrase
    const password = this.state.password
    const nextUnusedAddressIndex = this.props.nextUnusedAddressIndex

    this.props.createNewProfile(
      encryptedBackupPhrase,
      password, nextUnusedAddressIndex
    )
  }

  openPasswordPrompt(event) {
    event.preventDefault()
    this.setState({
      processing: false
    })
    this.props.resetCreateNewProfileError()
    this.setState({
      passwordPromptIsOpen: true
    })
  }

  closePasswordPrompt(event) {
    if (event) {
      event.preventDefault()
    }
    this.setState({
      passwordPromptIsOpen: false
    })
  }

  availableIdentityAddresses() {
    return this.props.nextUnusedAddressIndex + 1 <= this.props.identityAddresses.length
  }

  render() {
    const createProfileError = this.props.createProfileError
    const passwordPromptIsOpen = this.state.passwordPromptIsOpen
    return (
      <div className="card-list-container profile-content-wrapper">
        <Modal
          isOpen={passwordPromptIsOpen}
          onRequestClose={this.closePasswordPrompt}
          contentLabel="Password Modal"
          shouldCloseOnOverlayClick
          style={{ overlay: { zIndex: 10 } }}
          className="container-fluid"
        >
          <form onSubmit={this.createNewProfile}>
            <h3 className="modal-heading">Enter your password to create a new profile</h3>
            <div>
              {createProfileError ?
                <Alert key="1" message="Incorrect password" status="danger" />
                :
                null
              }
            </div>
            <InputGroup
              name="password"
              type="password"
              label=""
              placeholder="Password"
              data={this.state}
              onChange={this.onValueChange}
              required
            />
            <button
              disabled={this.state.processing}
              className="btn btn-primary btn-block"
              type="submit"
            >
              {this.state.processing ?
                <span>Creating...</span>
                :
                <span>Create new profile</span>
              }
            </button>
          </form>
        </Modal>
        <div>
          <h5 className="h5-landing">My Profiles</h5>
        </div>
        <div className="container card-list-container">
          <ul className="card-wrapper">
            {Object.keys(this.state.localIdentities).map((domainName) => {
              const identity = this.state.localIdentities[domainName]
              const person = new Person(identity.profile)

              if (identity.ownerAddress === domainName) {
                identity.canAddUsername = true
              } else {
                identity.canAddUsername = false
              }

              if (identity.domainName) {
                return (
                  <IdentityItem
                    key={identity.domainName}
                    label={identity.domainName}
                    pending={!identity.registered}
                    avatarUrl={person.avatarUrl() || ''}
                    url={`/profiles/${identity.domainName}/local`}
                    ownerAddress={identity.ownerAddress}
                    canAddUsername={identity.canAddUsername}
                  />
                )
              } else {
                return null
              }
            })}
          </ul>
        </div>
        <div className="card-list-container m-t-30">
          <button
            className="btn btn-blue btn-lg" onClick={this.openPasswordPrompt}
          >
            + Create
          </button>
        </div>
      </div>
    )
  }
}

export default connect(mapStateToProps, mapDispatchToProps)(IdentityPage)
