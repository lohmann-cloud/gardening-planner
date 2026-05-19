package de.gardenplanner.resource;

import de.gardenplanner.auth.AccessControl;
import de.gardenplanner.dto.MembershipDto;
import de.gardenplanner.dto.MembershipRequest;
import de.gardenplanner.entity.Garden;
import de.gardenplanner.entity.GardenMembership;
import de.gardenplanner.entity.User;
import de.gardenplanner.model.Role;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.validation.Valid;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

import java.util.List;
import java.util.UUID;

@Path("/gardens/{gardenId}/memberships")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class MembershipResource {

    @Inject
    AccessControl access;

    @GET
    public List<MembershipDto> list(@PathParam("gardenId") UUID gardenId) {
        access.requireMember(gardenId);
        return GardenMembership.findByGarden(gardenId).stream().map(MembershipDto::from).toList();
    }

    @POST
    @Transactional
    public Response invite(@PathParam("gardenId") UUID gardenId, @Valid MembershipRequest req) {
        access.requireOwner(gardenId);
        Garden garden = Garden.findById(gardenId);
        if (garden == null) throw new NotFoundException("Garden not found");

        String email = req.email.trim().toLowerCase();
        User invitee = User.findByEmail(email);
        if (invitee == null) {
            invitee = new User();
            invitee.email = email;
            invitee.name = email;
            invitee.persist();
        }

        GardenMembership existing = GardenMembership.findForGardenAndUser(gardenId, invitee.id);
        if (existing != null) {
            existing.role = req.role == null ? existing.role : req.role;
            return Response.ok(MembershipDto.from(existing)).build();
        }

        GardenMembership m = new GardenMembership();
        m.garden = garden;
        m.user = invitee;
        m.role = req.role == null ? Role.COLLABORATOR : req.role;
        m.persist();

        return Response.status(Response.Status.CREATED).entity(MembershipDto.from(m)).build();
    }

    @DELETE
    @Path("/{userId}")
    @Transactional
    public Response remove(@PathParam("gardenId") UUID gardenId, @PathParam("userId") UUID userId) {
        access.requireOwner(gardenId);
        GardenMembership m = GardenMembership.findForGardenAndUser(gardenId, userId);
        if (m == null) throw new NotFoundException("Membership not found");
        if (m.role == Role.OWNER) {
            throw new BadRequestException("Cannot remove the owner of a garden");
        }
        m.delete();
        return Response.noContent().build();
    }
}
